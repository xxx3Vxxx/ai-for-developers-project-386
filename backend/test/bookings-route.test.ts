import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb, type Db } from "../src/db.js";
import { errorMessages, fieldMessages } from "../src/messages.js";

/** Момент в зоне сервиса (Europe/Moscow, +03:00) как epoch-миллисекунды. */
function moscow(iso: string): number {
  return Date.parse(`${iso}+03:00`);
}

/** Добавляет бронь прямо в базу, минуя HTTP-шов (занятость проверяем записью). */
function insertBooking(db: Db, eventTypeId: string, startIso: string, endIso: string): void {
  db.prepare(
    `INSERT INTO bookings (event_type_id, start, end, guest_name, guest_email, created_at)
     VALUES (@eventTypeId, @start, @end, 'Гость', 'guest@example.com', 0)`,
  ).run({ eventTypeId, start: moscow(startIso), end: moscow(endIso) });
}

/** Валидное тело брони на 14 октября 2026, 09:00–09:30 в Москве. */
const validBody = {
  eventTypeId: "et-30",
  start: "2026-10-14T09:00:00+03:00",
  guestName: "Иван Петров",
  guestEmail: "guest@example.com",
};

/** Ошибка SQLite с машинным кодом, как их кладёт better-sqlite3. */
function sqliteError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

describe("POST /api/bookings", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Фиксирует «сейчас» как 13 октября 2026, 09:00 в Москве (06:00 UTC). */
  function freezeNow(): void {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T06:00:00.000Z"));
  }

  function buildTestApp(db: Db = createDb(":memory:")) {
    return buildApp({ config: loadConfig({}), db });
  }

  it("создаёт бронь: 201, end считает сервер, имя обрезано, email в нижнем регистре", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: { ...validBody, guestName: "  Иван Петров  ", guestEmail: "Guest@Example.COM" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        id: 1,
        eventTypeId: "et-30",
        eventTypeTitle: "Стандартная встреча",
        start: "2026-10-14T09:00:00+03:00",
        end: "2026-10-14T09:30:00+03:00",
        guestName: "Иван Петров",
        guestEmail: "guest@example.com",
      });
    } finally {
      await app.close();
    }
  });

  it("считает end из длительности типа: 15-минутный тип на 09:00 кончается в 09:15", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: { ...validBody, eventTypeId: "et-15" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        eventTypeId: "et-15",
        eventTypeTitle: "Короткий звонок",
        start: "2026-10-14T09:00:00+03:00",
        end: "2026-10-14T09:15:00+03:00",
      });
    } finally {
      await app.close();
    }
  });

  it("игнорирует лишние поля тела", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: { ...validBody, id: 99, admin: true },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).not.toHaveProperty("admin");
      expect(response.json().id).toBe(1);
    } finally {
      await app.close();
    }
  });

  it("400 VALIDATION_ERROR со всеми полями сразу, когда тело пустое", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({ method: "POST", url: "/api/bookings", payload: {} });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: errorMessages.VALIDATION_ERROR,
          fields: {
            guestName: fieldMessages.guestName.REQUIRED,
            guestEmail: fieldMessages.guestEmail.REQUIRED,
            eventTypeId: fieldMessages.eventTypeId.REQUIRED,
            start: fieldMessages.start.REQUIRED,
          },
        },
      });
    } finally {
      await app.close();
    }
  });

  it("400 VALIDATION_ERROR с полями для невалидных значений", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: {
          eventTypeId: "et-15",
          start: "не время",
          guestName: "Имя\nФамилия",
          guestEmail: "no-at.example.com",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.fields).toEqual({
        guestName: fieldMessages.guestName.INVALID_FORMAT,
        guestEmail: fieldMessages.guestEmail.INVALID_FORMAT,
        start: fieldMessages.start.INVALID_FORMAT,
      });
    } finally {
      await app.close();
    }
  });

  it.each(["[]", '"строка"', "42", "null"])(
    "не-объект в теле %s → 400 без fields",
    async (payload) => {
      freezeNow();
      const app = buildTestApp();
      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/bookings",
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

  it("404 EVENT_TYPE_NOT_FOUND для неизвестного типа", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: { ...validBody, eventTypeId: "et-999" },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "EVENT_TYPE_NOT_FOUND", message: errorMessages.EVENT_TYPE_NOT_FOUND },
      });
    } finally {
      await app.close();
    }
  });

  it("порядок: невалидные поля важнее отсутствующего типа, тип важнее слота", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const invalidFields = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: { eventTypeId: "et-999", start: validBody.start, guestName: "", guestEmail: "" },
      });
      expect(invalidFields.statusCode).toBe(400);
      expect(invalidFields.json().error.fields).toBeDefined();

      const unknownType = await app.inject({
        method: "POST",
        url: "/api/bookings",
        // 09:07 — не начало слота, но тип проверяется раньше слота.
        payload: { ...validBody, eventTypeId: "et-999", start: "2026-10-14T09:07:00+03:00" },
      });
      expect(unknownType.statusCode).toBe(404);
      expect(unknownType.json().error.code).toBe("EVENT_TYPE_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it.each([
    ["не выровнено по сетке", "2026-10-14T09:07:00+03:00"],
    ["не кратно длительности типа", "2026-10-14T09:20:00+03:00"],
    ["слот не укладывается до конца окна", "2026-10-14T18:00:00+03:00"],
    ["время уже наступило", "2026-10-13T09:00:00+03:00"],
    ["время до начала рабочего окна", "2026-10-14T08:45:00+03:00"],
  ])("400 INVALID_SLOT: %s", async (_case, start) => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: { ...validBody, start },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: { code: "INVALID_SLOT", message: errorMessages.INVALID_SLOT },
      });
    } finally {
      await app.close();
    }
  });

  it.each(["2026-10-12T09:00:00+03:00", "2026-10-27T09:00:00+03:00"])(
    "400 DATE_OUT_OF_WINDOW для выровненного слота вне окна: %s",
    async (start) => {
      freezeNow();
      const app = buildTestApp();
      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/bookings",
          payload: { ...validBody, start },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
          error: { code: "DATE_OUT_OF_WINDOW", message: errorMessages.DATE_OUT_OF_WINDOW },
        });
      } finally {
        await app.close();
      }
    },
  );

  it("порядок внутри слота: невыровненное время вне окна — INVALID_SLOT", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: { ...validBody, start: "2026-10-27T09:07:00+03:00" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("INVALID_SLOT");
    } finally {
      await app.close();
    }
  });

  it("409 CONFLICT, когда слот уже занят другой бронью", async () => {
    freezeNow();
    const db = createDb(":memory:");
    insertBooking(db, "et-15", "2026-10-14T09:00:00", "2026-10-14T09:30:00");
    const app = buildTestApp(db);
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: { ...validBody, eventTypeId: "et-15", start: "2026-10-14T09:00:00+03:00" },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: { code: "CONFLICT", message: errorMessages.CONFLICT },
      });
    } finally {
      await app.close();
    }
  });

  it("две параллельные записи в один слот: ровно один 201 и один 409", async () => {
    freezeNow();
    const db = createDb(":memory:");
    const app = buildTestApp(db);
    try {
      const request = {
        method: "POST" as const,
        url: "/api/bookings",
        payload: validBody,
      };
      const responses = await Promise.all([app.inject(request), app.inject(request)]);

      expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409]);
      // Инвариант «две брони не пересекаются»: уцелела ровно одна встреча.
      expect(db.prepare("SELECT COUNT(*) AS count FROM bookings").get()).toEqual({ count: 1 });
    } finally {
      await app.close();
    }
  });

  it("503 SERVICE_UNAVAILABLE, когда база занята дольше таймаута (подстава)", async () => {
    freezeNow();
    const db = createDb(":memory:");
    vi.spyOn(db, "transaction").mockImplementation(
      () =>
        ({
          immediate: () => {
            throw sqliteError("SQLITE_BUSY", "database is locked");
          },
        }) as never,
    );
    const app = buildTestApp(db);
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookings",
        payload: validBody,
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        error: { code: "SERVICE_UNAVAILABLE", message: errorMessages.SERVICE_UNAVAILABLE },
      });
    } finally {
      await app.close();
    }
  });
});
