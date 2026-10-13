import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createDb } from "../src/db.js";

function columns(db: ReturnType<typeof createDb>, table: string): string[] {
  return (db.pragma(`table_info(${table})`) as { name: string }[]).map((row) => row.name);
}

describe("createDb", () => {
  it("создаёт таблицы event_types и bookings с нужными колонками", () => {
    const db = createDb(":memory:");
    try {
      expect(columns(db, "event_types")).toEqual([
        "id",
        "title",
        "description",
        "duration_minutes",
        "created_at",
      ]);
      expect(columns(db, "bookings")).toEqual([
        "id",
        "event_type_id",
        "start",
        "end",
        "guest_name",
        "guest_email",
        "created_at",
      ]);
    } finally {
      db.close();
    }
  });

  it("сеет предустановленные типы et-15 и et-30 через INSERT OR IGNORE", () => {
    const db = createDb(":memory:");
    try {
      const rows = db
        .prepare(
          "SELECT id, title, description, duration_minutes FROM event_types ORDER BY duration_minutes",
        )
        .all();

      expect(rows).toEqual([
        {
          id: "et-15",
          title: "Короткий звонок",
          description: "Знакомство, быстрый вопрос или уточнение деталей.",
          duration_minutes: 15,
        },
        {
          id: "et-30",
          title: "Стандартная встреча",
          description: "Обсуждение задачи, разбор требований или демо.",
          duration_minutes: 30,
        },
      ]);
    } finally {
      db.close();
    }
  });
});

describe("createDb: целостность", () => {
  const booking = {
    event_type_id: "et-15",
    start: 1_000,
    end: 2_000,
    guest_name: "Гость",
    guest_email: "guest@example.com",
    created_at: 0,
  };

  function insertBooking(db: ReturnType<typeof createDb>, values: typeof booking): void {
    db.prepare(
      `INSERT INTO bookings (event_type_id, start, end, guest_name, guest_email, created_at)
       VALUES (@event_type_id, @start, @end, @guest_name, @guest_email, @created_at)`,
    ).run(values);
  }

  it("ограничивает ожидание блокировки базы (ADR-0007)", () => {
    const db = createDb(":memory:");
    try {
      expect(db.pragma("busy_timeout")).toEqual([{ timeout: 1500 }]);
    } finally {
      db.close();
    }
  });

  it("отвергает тип события с пустым id", () => {
    const db = createDb(":memory:");
    try {
      expect(() =>
        db
          .prepare(
            "INSERT INTO event_types (id, title, duration_minutes, created_at) VALUES (NULL, 'Тип', 15, 0)",
          )
          .run(),
      ).toThrow();
    } finally {
      db.close();
    }
  });

  it("отвергает длительность, не кратную 15 минутам", () => {
    const db = createDb(":memory:");
    try {
      expect(() =>
        db
          .prepare(
            "INSERT INTO event_types (id, title, duration_minutes, created_at) VALUES ('bad', 'Тип', 7, 0)",
          )
          .run(),
      ).toThrow();
    } finally {
      db.close();
    }
  });

  it("отвергает бронь, где end не больше start", () => {
    const db = createDb(":memory:");
    try {
      expect(() => insertBooking(db, { ...booking, end: booking.start })).toThrow();
    } finally {
      db.close();
    }
  });

  it("отвергает вторую бронь с тем же start (UNIQUE)", () => {
    const db = createDb(":memory:");
    try {
      insertBooking(db, booking);
      expect(() => insertBooking(db, { ...booking, end: booking.end + 1_000 })).toThrow();
    } finally {
      db.close();
    }
  });

  it("включает внешние ключи: бронь на несуществующий тип отвергается", () => {
    const db = createDb(":memory:");
    try {
      expect(() => insertBooking(db, { ...booking, event_type_id: "нет-такого" })).toThrow();
    } finally {
      db.close();
    }
  });

  it("индексирует bookings по event_type_id", () => {
    const db = createDb(":memory:");
    try {
      const indexes = db.prepare("PRAGMA index_list(bookings)").all() as { name: string }[];
      const columnsByIndex = indexes.map(({ name }) => {
        const info = db.prepare(`PRAGMA index_info(${name})`).all() as { name: string }[];
        return info.map((column) => column.name);
      });

      expect(columnsByIndex).toContainEqual(["event_type_id"]);
    } finally {
      db.close();
    }
  });

  it("создаёт каталог для файла базы, если его нет", () => {
    const directory = mkdtempSync(join(tmpdir(), "calendar-db-"));
    const nested = join(directory, "data", "calendar.sqlite");
    try {
      const db = createDb(nested);
      db.close();

      expect(existsSync(nested)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("применяет схему идемпотентно: повторный createDb на том же файле не ломает данные", () => {
    const directory = mkdtempSync(join(tmpdir(), "calendar-db-"));
    const file = join(directory, "calendar.sqlite");
    try {
      const first = createDb(file);
      const rowsAfterFirstStart = first
        .prepare("SELECT id, title, created_at FROM event_types ORDER BY id")
        .all();
      first.close();

      const second = createDb(file);
      try {
        const rowsAfterSecondStart = second
          .prepare("SELECT id, title, created_at FROM event_types ORDER BY id")
          .all();

        expect(rowsAfterFirstStart).toHaveLength(2);
        expect(rowsAfterSecondStart).toEqual(rowsAfterFirstStart);
      } finally {
        second.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
