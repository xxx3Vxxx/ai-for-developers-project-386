import type { components } from "contracts";
import type { FastifyInstance } from "fastify";

type EventType = components["schemas"]["EventType"];

/**
 * Регистрирует `GET /api/event-types` — справочник типов событий в
 * детерминированном порядке: `durationMinutes` asc, при равенстве `id` asc
 * (ADR-0009). «Голый» массив без обёртки.
 */
export function registerEventTypeRoutes(app: FastifyInstance): void {
  app.get("/api/event-types", async (): Promise<EventType[]> => {
    return app.db
      .prepare(
        `SELECT id, title, description, duration_minutes AS durationMinutes
         FROM event_types
         ORDER BY duration_minutes ASC, id ASC`,
      )
      .all() as EventType[];
  });
}
