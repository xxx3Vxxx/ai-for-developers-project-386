import type { components } from "contracts";
import type { FastifyInstance } from "fastify";

import type { Config } from "../config.js";
import { ApiError } from "../errors.js";
import { fieldMessages } from "../messages.js";
import { buildDaySlots } from "../slots.js";
import { addDays, dateInTimeZone, isCalendarDate } from "../time.js";

type SlotsResponse = components["schemas"]["SlotsResponse"];

/**
 * Регистрирует `GET /api/event-types/:id/slots?date=YYYY-MM-DD` — полную сетку
 * слотов дня для типа события (ADR-0002, ADR-0003, ADR-0009). Порядок проверок:
 * формат `date` → окно записи → существование типа.
 */
export function registerSlotRoutes(app: FastifyInstance, config: Config): void {
  app.get("/api/event-types/:id/slots", async (request): Promise<SlotsResponse> => {
    const { id } = request.params as { id: string };
    const { date } = request.query as { date?: unknown };

    if (typeof date !== "string" || date.trim() === "") {
      throw new ApiError("VALIDATION_ERROR", { date: fieldMessages.date.REQUIRED });
    }
    if (!isCalendarDate(date)) {
      throw new ApiError("VALIDATION_ERROR", { date: fieldMessages.date.INVALID_FORMAT });
    }

    const now = new Date();
    const today = dateInTimeZone(config.serviceTimezone, now);
    const lastDate = addDays(today, config.bookingWindowDays - 1);
    if (date < today || date > lastDate) throw new ApiError("DATE_OUT_OF_WINDOW");

    const eventType = app.db
      .prepare(`SELECT duration_minutes AS durationMinutes FROM event_types WHERE id = ?`)
      .get(id) as { durationMinutes: number } | undefined;
    if (!eventType) throw new ApiError("EVENT_TYPE_NOT_FOUND");

    return {
      eventTypeId: id,
      date,
      slots: buildDaySlots({
        db: app.db,
        config,
        durationMinutes: eventType.durationMinutes,
        date,
        now,
        today,
      }),
    };
  });
}
