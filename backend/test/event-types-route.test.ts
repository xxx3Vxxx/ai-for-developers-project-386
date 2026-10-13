import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb, type Db } from "../src/db.js";
import { durationTooLargeMessage, errorMessages, fieldMessages } from "../src/messages.js";

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

/** Ошибка SQLite с машинным кодом, как их кладёт better-sqlite3. */
function sqliteError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

describe("POST /api/event-types", () => {
  function buildTestApp(db: Db = createDb(":memory:")) {
    return buildApp({ config: loadConfig({}), db });
  }

  it("создаёт тип: 201, «голая» форма чтения, поля обрезаны и видны в GET", async () => {
    const db = createDb(":memory:");
    const app = buildTestApp(db);
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/event-types",
        payload: {
          title: "  Демо-звонок  ",
          description: "  Показ продукта и ответы на вопросы.  ",
          durationMinutes: 45,
        },
      });

      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created).toMatchObject({
        title: "Демо-звонок",
        description: "Показ продукта и ответы на вопросы.",
        durationMinutes: 45,
      });
      expect(typeof created.id).toBe("string");
      expect(created.id.length).toBeGreaterThan(0);

      const list = await app.inject({ method: "GET", url: "/api/event-types" });
      expect(list.json()).toContainEqual(created);
    } finally {
      await app.close();
    }
  });

  it("описание необязательно: отсутствует — в ответе пустая строка", async () => {
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/event-types",
        payload: { title: "Заметка", durationMinutes: 15 },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        title: "Заметка",
        description: "",
        durationMinutes: 15,
      });
    } finally {
      await app.close();
    }
  });

  it("игнорирует лишние поля тела", async () => {
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/event-types",
        payload: { title: "Тип", durationMinutes: 30, id: "et-999", createdAt: 0 },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().id).not.toBe("et-999");
    } finally {
      await app.close();
    }
  });

  it("400 VALIDATION_ERROR со всеми полями сразу, когда тело пустое", async () => {
    const app = buildTestApp();
    try {
      const response = await app.inject({ method: "POST", url: "/api/event-types", payload: {} });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: errorMessages.VALIDATION_ERROR,
          fields: {
            title: fieldMessages.title.REQUIRED,
            durationMinutes: fieldMessages.durationMinutes.REQUIRED,
          },
        },
      });
    } finally {
      await app.close();
    }
  });

  it("400 VALIDATION_ERROR с сообщениями для невалидных значений", async () => {
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/event-types",
        payload: {
          title: "х".repeat(101),
          description: "х".repeat(501),
          durationMinutes: 20,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.fields).toEqual({
        title: fieldMessages.title.TOO_LONG,
        description: fieldMessages.description.TOO_LONG,
        durationMinutes: fieldMessages.durationMinutes.NOT_MULTIPLE,
      });
    } finally {
      await app.close();
    }
  });

  it.each([
    ["не целое", 30.5, fieldMessages.durationMinutes.INVALID_FORMAT],
    ["строка", "30", fieldMessages.durationMinutes.INVALID_FORMAT],
    ["ноль", 0, fieldMessages.durationMinutes.TOO_SMALL],
    ["длиннее окна", 555, durationTooLargeMessage(540)],
  ])("400 VALIDATION_ERROR для длительности (%s)", async (_case, durationMinutes, message) => {
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/event-types",
        payload: { title: "Тип", durationMinutes },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.fields).toEqual({ durationMinutes: message });
    } finally {
      await app.close();
    }
  });

  it.each(["[]", '"строка"', "42", "null"])(
    "не-объект в теле %s → 400 без fields",
    async (payload) => {
      const app = buildTestApp();
      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/event-types",
          headers: { "content-type": "application/json" },
          payload,
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
          error: { code: "VALIDATION_ERROR", message: errorMessages.VALIDATION_ERROR },
        });
      } finally {
        await app.close();
      }
    },
  );

  it("503 SERVICE_UNAVAILABLE, когда база занята (подстава)", async () => {
    const db = createDb(":memory:");
    vi.spyOn(db, "prepare").mockImplementation(
      () =>
        ({
          run: () => {
            throw sqliteError("SQLITE_BUSY", "database is locked");
          },
        }) as never,
    );
    const app = buildTestApp(db);
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/event-types",
        payload: { title: "Тип", durationMinutes: 30 },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        error: { code: "SERVICE_UNAVAILABLE", message: errorMessages.SERVICE_UNAVAILABLE },
      });
    } finally {
      vi.restoreAllMocks();
      await app.close();
    }
  });

  it("500 INTERNAL_ERROR на неожиданную ошибку базы", async () => {
    const db = createDb(":memory:");
    vi.spyOn(db, "prepare").mockImplementation(
      () =>
        ({
          run: () => {
            throw new Error("boom");
          },
        }) as never,
    );
    const app = buildTestApp(db);
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/event-types",
        payload: { title: "Тип", durationMinutes: 30 },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: { code: "INTERNAL_ERROR", message: errorMessages.INTERNAL_ERROR },
      });
    } finally {
      vi.restoreAllMocks();
      await app.close();
    }
  });
});
