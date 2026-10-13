import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { createDb, type Db } from "../src/db.js";

/** Добавляет типы поверх сида, чтобы проверить порядок выдачи (ADR-0009). */
function insertEventType(
  db: Db,
  eventType: { id: string; title: string; description: string; durationMinutes: number },
): void {
  db.prepare(
    `INSERT INTO event_types (id, title, description, duration_minutes, created_at)
     VALUES (@id, @title, @description, @durationMinutes, 0)`,
  ).run(eventType);
}

describe("GET /api/event-types", () => {
  it("отдаёт предустановленные типы в форме { id, title, description, durationMinutes }", async () => {
    const app = buildApp({ db: createDb(":memory:") });
    try {
      const response = await app.inject({ method: "GET", url: "/api/event-types" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        {
          id: "et-15",
          title: "Короткий звонок",
          description: "Знакомство, быстрый вопрос или уточнение деталей.",
          durationMinutes: 15,
        },
        {
          id: "et-30",
          title: "Стандартная встреча",
          description: "Обсуждение задачи, разбор требований или демо.",
          durationMinutes: 30,
        },
      ]);
    } finally {
      await app.close();
    }
  });

  it("упорядочивает по durationMinutes asc, при равенстве — id asc", async () => {
    const db = createDb(":memory:");
    // Вставлены вразнобой: порядок должен задать запрос, а не порядок вставки.
    insertEventType(db, { id: "et-z", title: "Тип Z", description: "Z", durationMinutes: 30 });
    insertEventType(db, { id: "et-a", title: "Тип A", description: "A", durationMinutes: 30 });
    insertEventType(db, { id: "et-45", title: "Тип 45", description: "45", durationMinutes: 45 });

    const app = buildApp({ db });
    try {
      const response = await app.inject({ method: "GET", url: "/api/event-types" });

      expect(response.statusCode).toBe(200);
      expect(response.json().map((eventType: { id: string }) => eventType.id)).toEqual([
        "et-15",
        "et-30",
        "et-a",
        "et-z",
        "et-45",
      ]);
    } finally {
      await app.close();
    }
  });
});
