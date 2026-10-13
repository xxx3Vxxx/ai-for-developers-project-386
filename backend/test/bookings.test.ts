import { describe, expect, it } from "vitest";

import { createBooking, type CreateBookingInput } from "../src/bookings.js";
import type { Db } from "../src/db.js";

const input: CreateBookingInput = {
  eventTypeId: "et-15",
  start: 1_000,
  end: 2_000,
  guestName: "Гость",
  guestEmail: "guest@example.com",
  createdAt: 0,
};

interface FakeDbOptions {
  /** Строка, которую вернёт `SELECT` пересечения (`undefined` — свободно). */
  overlap?: unknown;
  /** Имитация `INSERT`; по умолчанию — успешная вставка с id. */
  insert?: () => { lastInsertRowid: number | bigint };
  /** Если задано, транзакция падает этой ошибкой вместо работы. */
  immediateError?: Error;
}

/** Подставная база со швом ADR-0007: проверяем отображение исходов, а не SQL. */
function fakeDb({ overlap, insert, immediateError }: FakeDbOptions = {}): Db {
  const overlapStatement = { get: () => overlap };
  const insertStatement = { run: () => insert?.() };
  const prepare = (sql: string) =>
    sql.includes("INSERT INTO bookings") ? insertStatement : overlapStatement;

  if (immediateError) {
    return {
      prepare,
      transaction: () => ({
        immediate: () => {
          throw immediateError;
        },
      }),
    } as unknown as Db;
  }

  const transaction = (work: (value: unknown) => unknown) => {
    const run = (value: unknown) => work(value);
    return Object.assign(run, { immediate: run, deferred: run, exclusive: run });
  };

  return { prepare, transaction } as unknown as Db;
}

function sqliteError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

describe("createBooking (ADR-0007)", () => {
  it("возвращает created с id вставленной брони", () => {
    const db = fakeDb({ insert: () => ({ lastInsertRowid: 7 }) });

    expect(createBooking(db, input)).toEqual({ status: "created", id: 7 });
  });

  it("возвращает conflict, когда слот пересекается с бронью", () => {
    const db = fakeDb({ overlap: { "1": 1 } });

    expect(createBooking(db, input)).toEqual({ status: "conflict" });
  });

  it("нарушение UNIQUE(start) — тоже conflict, а не ошибка", () => {
    const db = fakeDb({
      insert: () => {
        throw sqliteError("SQLITE_CONSTRAINT_UNIQUE");
      },
    });

    expect(createBooking(db, input)).toEqual({ status: "conflict" });
  });

  it("SQLITE_BUSY после таймаута — busy", () => {
    const db = fakeDb({ immediateError: sqliteError("SQLITE_BUSY") });

    expect(createBooking(db, input)).toEqual({ status: "busy" });
  });

  it("прочие ошибки не глотает", () => {
    const db = fakeDb({ immediateError: new Error("диск отвалился") });

    expect(() => createBooking(db, input)).toThrow("диск отвалился");
  });
});
