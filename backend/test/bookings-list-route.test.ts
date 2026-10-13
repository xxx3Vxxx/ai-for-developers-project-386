import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb, type Db } from "../src/db.js";
import { errorMessages } from "../src/messages.js";

/** Момент в зоне сервиса (Europe/Moscow, +03:00) как epoch-миллисекунды. */
function moscow(iso: string): number {
  return Date.parse(`${iso}+03:00`);
}

interface BookingSeed {
  eventTypeId: string;
  start: string;
  end: string;
  guestName: string;
  guestEmail: string;
}

/** Добавляет бронь прямо в базу, минуя HTTP-шов. */
function insertBooking(db: Db, seed: BookingSeed): void {
  db.prepare(
    `INSERT INTO bookings (event_type_id, start, end, guest_name, guest_email, created_at)
     VALUES (@eventTypeId, @start, @end, @guestName, @guestEmail, 0)`,
  ).run({
    eventTypeId: seed.eventTypeId,
    start: moscow(seed.start),
    end: moscow(seed.end),
    guestName: seed.guestName,
    guestEmail: seed.guestEmail,
  });
}

describe("GET /api/bookings", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Фиксирует «сейчас» как 13 октября 2026, 12:00 в Москве (09:00 UTC). */
  function freezeNow(): void {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T09:00:00.000Z"));
  }

  function buildTestApp(db: Db = createDb(":memory:")) {
    return buildApp({ config: loadConfig({}), db });
  }

  it("отдаёт пустой массив, когда броней нет", async () => {
    freezeNow();
    const app = buildTestApp();
    try {
      const response = await app.inject({ method: "GET", url: "/api/bookings" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it("отдаёт предстоящие встречи в форме чтения, порядок start asc", async () => {
    freezeNow();
    const db = createDb(":memory:");
    // Вставлены вразнобой: порядок задаёт запрос, а не порядок вставки.
    insertBooking(db, {
      eventTypeId: "et-30",
      start: "2026-10-14T10:00:00",
      end: "2026-10-14T10:30:00",
      guestName: "Пётр Ким",
      guestEmail: "petr@example.com",
    });
    insertBooking(db, {
      eventTypeId: "et-15",
      start: "2026-10-14T09:00:00",
      end: "2026-10-14T09:15:00",
      guestName: "Мария Соколова",
      guestEmail: "maria@example.com",
    });
    insertBooking(db, {
      eventTypeId: "et-30",
      start: "2026-10-13T11:45:00",
      end: "2026-10-13T12:15:00",
      guestName: "Иван Петров",
      guestEmail: "ivan@example.com",
    });

    const app = buildTestApp(db);
    try {
      const response = await app.inject({ method: "GET", url: "/api/bookings" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        {
          id: 3,
          eventTypeId: "et-30",
          eventTypeTitle: "Стандартная встреча",
          start: "2026-10-13T11:45:00+03:00",
          end: "2026-10-13T12:15:00+03:00",
          guestName: "Иван Петров",
          guestEmail: "ivan@example.com",
        },
        {
          id: 2,
          eventTypeId: "et-15",
          eventTypeTitle: "Короткий звонок",
          start: "2026-10-14T09:00:00+03:00",
          end: "2026-10-14T09:15:00+03:00",
          guestName: "Мария Соколова",
          guestEmail: "maria@example.com",
        },
        {
          id: 1,
          eventTypeId: "et-30",
          eventTypeTitle: "Стандартная встреча",
          start: "2026-10-14T10:00:00+03:00",
          end: "2026-10-14T10:30:00+03:00",
          guestName: "Пётр Ким",
          guestEmail: "petr@example.com",
        },
      ]);
    } finally {
      await app.close();
    }
  });

  it("фильтрует по end > now: прошедшие и завершившиеся ровно сейчас отброшены", async () => {
    freezeNow();
    const db = createDb(":memory:");
    // Завершилась раньше «сейчас» — не предстоящая.
    insertBooking(db, {
      eventTypeId: "et-15",
      start: "2026-10-13T09:00:00",
      end: "2026-10-13T09:30:00",
      guestName: "Прошлая",
      guestEmail: "past@example.com",
    });
    // Завершается ровно в «сейчас» — граница: end > now ложно.
    insertBooking(db, {
      eventTypeId: "et-30",
      start: "2026-10-13T10:00:00",
      end: "2026-10-13T12:00:00",
      guestName: "Граница",
      guestEmail: "edge@example.com",
    });
    // Идёт прямо сейчас — остаётся до завершения.
    insertBooking(db, {
      eventTypeId: "et-30",
      start: "2026-10-13T11:45:00",
      end: "2026-10-13T12:15:00",
      guestName: "Идущая",
      guestEmail: "now@example.com",
    });

    const app = buildTestApp(db);
    try {
      const response = await app.inject({ method: "GET", url: "/api/bookings" });

      expect(response.statusCode).toBe(200);
      expect(response.json().map((booking: { guestName: string }) => booking.guestName)).toEqual([
        "Идущая",
      ]);
    } finally {
      await app.close();
    }
  });

  it("500 INTERNAL_ERROR в конверте, когда чтение падает", async () => {
    freezeNow();
    const db = createDb(":memory:");
    vi.spyOn(db, "prepare").mockImplementation(() => {
      throw new Error("boom");
    });
    const app = buildTestApp(db);
    try {
      const response = await app.inject({ method: "GET", url: "/api/bookings" });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: { code: "INTERNAL_ERROR", message: errorMessages.INTERNAL_ERROR },
      });
    } finally {
      await app.close();
    }
  });
});
