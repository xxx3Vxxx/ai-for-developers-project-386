import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb, type Db } from "../src/db.js";
import { errorMessages } from "../src/messages.js";

/** Момент в зоне сервиса (Europe/Moscow, +03:00) как epoch-миллисекунды. */
function moscow(iso: string): number {
  return Date.parse(`${iso}+03:00`);
}

/** Добавляет бронь прямо в базу, минуя HTTP-шов (занятость проверяем чтением). */
function insertBooking(db: Db, eventTypeId: string, startIso: string, endIso: string): void {
  db.prepare(
    `INSERT INTO bookings (event_type_id, start, end, guest_name, guest_email, created_at)
     VALUES (@eventTypeId, @start, @end, 'Гость', 'guest@example.com', 0)`,
  ).run({ eventTypeId, start: moscow(startIso), end: moscow(endIso) });
}

/** Добавляет тип события поверх сида, чтобы проверить сетку другой длительности. */
function insertEventType(db: Db, id: string, durationMinutes: number): void {
  db.prepare(
    `INSERT INTO event_types (id, title, description, duration_minutes, created_at)
     VALUES (@id, @title, '', @durationMinutes, 0)`,
  ).run({ id, title: id, durationMinutes });
}

/** Время начала слота как `HH:MM` из строки ISO со смещением зоны. */
function startTime(slot: { start: string }): string {
  return slot.start.slice(11, 16);
}

describe("GET /api/event-types/:id/slots", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Фиксирует «сейчас» как 13 октября 2026, 09:00 в Москве (06:00 UTC). */
  function freezeNow(): void {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T06:00:00.000Z"));
  }

  it("отдаёт полную сетку дня в форме { eventTypeId, date, slots } и порядке start asc", async () => {
    freezeNow();
    const app = buildApp({ config: loadConfig({}), db: createDb(":memory:") });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/event-types/et-15/slots?date=2026-10-14",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.eventTypeId).toBe("et-15");
      expect(body.date).toBe("2026-10-14");
      // 09:00–18:00 шагом 15 минут — 36 слотов.
      expect(body.slots).toHaveLength(36);
      expect(body.slots[0]).toEqual({
        start: "2026-10-14T09:00:00+03:00",
        end: "2026-10-14T09:15:00+03:00",
        available: true,
      });
      expect(body.slots.at(-1)).toEqual({
        start: "2026-10-14T17:45:00+03:00",
        end: "2026-10-14T18:00:00+03:00",
        available: true,
      });

      const starts = body.slots.map((slot: { start: string }) => slot.start);
      expect([...starts].sort()).toEqual(starts);
    } finally {
      await app.close();
    }
  });

  it("выравнивает сетку от начала окна с шагом в длительность типа", async () => {
    freezeNow();
    const db = createDb(":memory:");
    insertEventType(db, "et-45", 45);

    const app = buildApp({ config: loadConfig({}), db });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/event-types/et-45/slots?date=2026-10-14",
      });

      expect(response.statusCode).toBe(200);
      const slots = response.json().slots;
      expect(slots.map(startTime)).toEqual([
        "09:00",
        "09:45",
        "10:30",
        "11:15",
        "12:00",
        "12:45",
        "13:30",
        "14:15",
        "15:00",
        "15:45",
        "16:30",
        "17:15",
      ]);
      // Последний слот кончается ровно в конце окна; неиспользованного остатка нет.
      expect(slots.at(-1).end).toBe("2026-10-14T18:00:00+03:00");
    } finally {
      await app.close();
    }
  });

  it("строит одинаковую сетку для всех 14 дней, включая выходные", async () => {
    freezeNow();
    const app = buildApp({ config: loadConfig({}), db: createDb(":memory:") });
    try {
      async function startsOf(date: string): Promise<string[]> {
        const response = await app.inject({
          method: "GET",
          url: `/api/event-types/et-15/slots?date=${date}`,
        });
        return response.json().slots.map(startTime);
      }

      // 2026-10-17 — суббота, 2026-10-18 — воскресенье.
      const weekday = await startsOf("2026-10-14");
      expect(await startsOf("2026-10-17")).toEqual(weekday);
      expect(await startsOf("2026-10-18")).toEqual(weekday);
    } finally {
      await app.close();
    }
  });

  it("помечает занятые слоты available: false независимо от типа брони", async () => {
    freezeNow();
    const db = createDb(":memory:");
    // Бронь 09:00–10:00 создана под 15-минутный тип, но блокирует слоты типа на 30.
    insertBooking(db, "et-15", "2026-10-14T09:00:00", "2026-10-14T10:00:00");

    const app = buildApp({ config: loadConfig({}), db });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/event-types/et-30/slots?date=2026-10-14",
      });

      const byStart = new Map(
        response
          .json()
          .slots.map((slot: { start: string; available: boolean }) => [
            startTime(slot),
            slot.available,
          ]),
      );
      expect(byStart.get("09:00")).toBe(false);
      expect(byStart.get("09:30")).toBe(false);
      expect(byStart.get("10:00")).toBe(true);
    } finally {
      await app.close();
    }
  });

  it("на сегодня помечает прошедшие слоты available: false, а будущие — true", async () => {
    freezeNow();
    const app = buildApp({ config: loadConfig({}), db: createDb(":memory:") });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/event-types/et-15/slots?date=2026-10-13",
      });

      const byStart = new Map(
        response
          .json()
          .slots.map((slot: { start: string; available: boolean }) => [
            startTime(slot),
            slot.available,
          ]),
      );
      // now = 09:00, поэтому слот 09:00 (start === now) недоступен.
      expect(byStart.get("09:00")).toBe(false);
      expect(byStart.get("09:15")).toBe(true);
    } finally {
      await app.close();
    }
  });

  it("отдаёт 400 VALIDATION_ERROR без date и при невалидной дате", async () => {
    freezeNow();
    const app = buildApp({ config: loadConfig({}), db: createDb(":memory:") });
    try {
      for (const url of [
        "/api/event-types/et-15/slots",
        "/api/event-types/et-15/slots?date=abc",
        "/api/event-types/et-15/slots?date=2026-13-01",
        "/api/event-types/et-15/slots?date=2026-10-32",
      ]) {
        const response = await app.inject({ method: "GET", url });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
          error: { code: "VALIDATION_ERROR", message: errorMessages.VALIDATION_ERROR },
        });
      }
    } finally {
      await app.close();
    }
  });

  it("отдаёт 400 DATE_OUT_OF_WINDOW для дат вне окна записи", async () => {
    freezeNow();
    const app = buildApp({ config: loadConfig({}), db: createDb(":memory:") });
    try {
      for (const date of ["2026-10-12", "2026-10-27"]) {
        const response = await app.inject({
          method: "GET",
          url: `/api/event-types/et-15/slots?date=${date}`,
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
          error: { code: "DATE_OUT_OF_WINDOW", message: errorMessages.DATE_OUT_OF_WINDOW },
        });
      }
    } finally {
      await app.close();
    }
  });

  it("включает обе границы окна записи: сегодня и сегодня + 13", async () => {
    freezeNow();
    const app = buildApp({ config: loadConfig({}), db: createDb(":memory:") });
    try {
      for (const date of ["2026-10-13", "2026-10-26"]) {
        const response = await app.inject({
          method: "GET",
          url: `/api/event-types/et-15/slots?date=${date}`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().date).toBe(date);
      }
    } finally {
      await app.close();
    }
  });

  it("отдаёт 404 EVENT_TYPE_NOT_FOUND для неизвестного типа", async () => {
    freezeNow();
    const app = buildApp({ config: loadConfig({}), db: createDb(":memory:") });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/event-types/et-999/slots?date=2026-10-14",
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "EVENT_TYPE_NOT_FOUND", message: errorMessages.EVENT_TYPE_NOT_FOUND },
      });
    } finally {
      await app.close();
    }
  });
});
