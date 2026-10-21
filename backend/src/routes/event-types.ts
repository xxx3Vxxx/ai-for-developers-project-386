import { randomUUID } from "node:crypto";

import type { EventType } from "contracts/types";
import type { FastifyInstance } from "fastify";

import type { Config } from "../config.js";
import { ApiError, type ErrorFields } from "../errors.js";
import { createEventType } from "../event-types.js";
import {
  isBodyObject,
  validateDescription,
  validateDurationMinutes,
  validateTitle,
  workWindowMinutes,
} from "../validation.js";

/**
 * Регистрирует `GET /api/event-types` — справочник типов событий в
 * детерминированном порядке: `durationMinutes` asc, при равенстве `id` asc
 * (ADR-0009). «Голый» массив без обёртки.
 *
 * `POST` создаёт тип события (ADR-0010): `title` обязателен (1–100 после trim),
 * `description` необязателен (≤ 500, дефолт `""`), `durationMinutes` — целое,
 * кратное 15, от 15 до длины рабочего окна (ADR-0003). Все нарушения — `400
 * VALIDATION_ERROR` со всеми невалидными полями сразу. Уникальности `title` нет,
 * поэтому конфликта не бывает; `SQLITE_BUSY` — перегрузка (`503`, ADR-0007). Успех
 * — `201` и созданный тип в форме чтения.
 */
export function registerEventTypeRoutes(app: FastifyInstance, config: Config): void {
  app.get("/api/event-types", async (): Promise<EventType[]> => {
    return app.db
      .prepare(
        `SELECT id, title, description, duration_minutes AS durationMinutes
         FROM event_types
         ORDER BY duration_minutes ASC, id ASC`,
      )
      .all() as EventType[];
  });

  app.post("/api/event-types", async (request, reply): Promise<EventType> => {
    const body = request.body;
    if (!isBodyObject(body)) throw new ApiError("VALIDATION_ERROR");

    const maxDurationMinutes = workWindowMinutes(config.workDayStart, config.workDayEnd);
    const title = validateTitle(body.title);
    const description = validateDescription(body.description);
    const durationMinutes = validateDurationMinutes(body.durationMinutes, maxDurationMinutes);

    const fields: ErrorFields = {};
    if (title.message) fields.title = title.message;
    if (description.message) fields.description = description.message;
    if (durationMinutes.message) fields.durationMinutes = durationMinutes.message;
    if (Object.keys(fields).length > 0) throw new ApiError("VALIDATION_ERROR", fields);

    const id = `et-${randomUUID()}`;
    const outcome = createEventType(app.db, {
      id,
      title: title.value,
      description: description.value,
      durationMinutes: durationMinutes.value,
      createdAt: Date.now(),
    });
    if (outcome.status === "busy") throw new ApiError("SERVICE_UNAVAILABLE");

    reply.status(201);
    return {
      id,
      title: title.value,
      description: description.value,
      durationMinutes: durationMinutes.value,
    };
  });
}
