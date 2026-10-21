import type { Booking } from "contracts/types";
import type { FastifyInstance } from "fastify";

import { createBooking } from "../bookings.js";
import type { Config } from "../config.js";
import { ApiError, type ErrorFields } from "../errors.js";
import { slotStartOf } from "../slots.js";
import { addDays, dateInTimeZone, toZonedIso } from "../time.js";
import {
  isBodyObject,
  validateEventTypeId,
  validateGuestEmail,
  validateGuestName,
  validateStart,
} from "../validation.js";

const MINUTE = 60_000;

/** Строка выборки предстоящих встреч: моменты — epoch-миллисекунды (ADR-0004). */
interface BookingRow {
  id: number;
  eventTypeId: string;
  eventTypeTitle: string;
  start: number;
  end: number;
  guestName: string;
  guestEmail: string;
}

/**
 * Регистрирует `GET /api/bookings` и `POST /api/bookings`.
 *
 * `GET` отдаёт предстоящие встречи владельца (ADR-0009): «предстоящая» — `end >
 * now`, поэтому идущая прямо сейчас встреча остаётся в списке до завершения;
 * порядок `start` asc, пагинации нет. Бронь отдаётся вместе с названием типа
 * события, а моменты — как ISO 8601 со смещением зоны сервиса (ADR-0004).
 *
 * `POST` — запись гостя (ADR-0007, ADR-0010). Порядок проверок: структура и поля
 * тела (все невалидные поля сразу) → существование типа → `start` как начало
 * слота сетки → дата в окне записи → `start > now` → транзакция. Слотовые ошибки
 * идут без `fields`: это недоступность слота, а не ошибка поля формы.
 */
export function registerBookingRoutes(app: FastifyInstance, config: Config): void {
  app.get("/api/bookings", async (): Promise<Booking[]> => {
    const rows = app.db
      .prepare(
        `SELECT b.id AS id,
                b.event_type_id AS eventTypeId,
                e.title AS eventTypeTitle,
                b.start AS start,
                b.end AS end,
                b.guest_name AS guestName,
                b.guest_email AS guestEmail
         FROM bookings AS b
         JOIN event_types AS e ON e.id = b.event_type_id
         WHERE b.end > ?
         ORDER BY b.start ASC`,
      )
      .all(Date.now()) as BookingRow[];

    return rows.map((row) => ({
      id: row.id,
      eventTypeId: row.eventTypeId,
      eventTypeTitle: row.eventTypeTitle,
      start: toZonedIso(config.serviceTimezone, new Date(row.start)),
      end: toZonedIso(config.serviceTimezone, new Date(row.end)),
      guestName: row.guestName,
      guestEmail: row.guestEmail,
    }));
  });

  app.post("/api/bookings", async (request, reply): Promise<Booking> => {
    const body = request.body;
    if (!isBodyObject(body)) throw new ApiError("VALIDATION_ERROR");

    const guestName = validateGuestName(body.guestName);
    const guestEmail = validateGuestEmail(body.guestEmail);
    const eventTypeId = validateEventTypeId(body.eventTypeId);
    const start = validateStart(body.start);

    const fields: ErrorFields = {};
    if (guestName.message) fields.guestName = guestName.message;
    if (guestEmail.message) fields.guestEmail = guestEmail.message;
    if (eventTypeId.message) fields.eventTypeId = eventTypeId.message;
    if (start.message) fields.start = start.message;
    if (Object.keys(fields).length > 0) throw new ApiError("VALIDATION_ERROR", fields);

    const now = new Date();
    const today = dateInTimeZone(config.serviceTimezone, now);

    const eventType = app.db
      .prepare(`SELECT title, duration_minutes AS durationMinutes FROM event_types WHERE id = ?`)
      .get(eventTypeId.value) as { title: string; durationMinutes: number } | undefined;
    if (!eventType) throw new ApiError("EVENT_TYPE_NOT_FOUND");

    const startAt = new Date(start.value);
    const slot = slotStartOf({
      timeZone: config.serviceTimezone,
      workDayStart: config.workDayStart,
      workDayEnd: config.workDayEnd,
      durationMinutes: eventType.durationMinutes,
      instant: startAt,
    });
    if (!slot) throw new ApiError("INVALID_SLOT");

    const lastDate = addDays(today, config.bookingWindowDays - 1);
    if (slot.date < today || slot.date > lastDate) throw new ApiError("DATE_OUT_OF_WINDOW");
    if (startAt.getTime() <= now.getTime()) throw new ApiError("INVALID_SLOT");

    const endAt = new Date(startAt.getTime() + eventType.durationMinutes * MINUTE);
    const outcome = createBooking(app.db, {
      eventTypeId: eventTypeId.value,
      start: startAt.getTime(),
      end: endAt.getTime(),
      guestName: guestName.value,
      guestEmail: guestEmail.value,
      createdAt: now.getTime(),
    });

    if (outcome.status === "conflict") throw new ApiError("CONFLICT");
    if (outcome.status === "busy") throw new ApiError("SERVICE_UNAVAILABLE");

    reply.status(201);
    return {
      id: outcome.id,
      eventTypeId: eventTypeId.value,
      eventTypeTitle: eventType.title,
      start: toZonedIso(config.serviceTimezone, startAt),
      end: toZonedIso(config.serviceTimezone, endAt),
      guestName: guestName.value,
      guestEmail: guestEmail.value,
    };
  });
}
