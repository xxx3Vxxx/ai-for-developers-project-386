import type { Db } from "./db.js";

/** Данные брони, уже нормализованные и проверенные роутом. */
export interface CreateBookingInput {
  eventTypeId: string;
  /** Начало брони — epoch-миллисекунды (ADR-0004). */
  start: number;
  /** Конец брони — epoch-миллисекунды (ADR-0004). */
  end: number;
  guestName: string;
  guestEmail: string;
  createdAt: number;
}

/** Исход попытки записи: успех, конфликт по времени или занятая база. */
export type CreateBookingResult =
  { status: "created"; id: number } | { status: "conflict" } | { status: "busy" };

/** Машинный код ошибки SQLite: better-sqlite3 кладёт расширенный код в `code`. */
function sqliteCode(error: unknown): string | undefined {
  if (error instanceof Error && "code" in error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

/**
 * Создаёт бронь под write-lock (ADR-0007): транзакция `BEGIN IMMEDIATE` берёт
 * блокировку до `SELECT` пересечения, поэтому гонка read→write невозможна, а
 * проверка и вставка идут без `await` между ними. Проверка пересечения
 * `start < :end AND end > :start` держит инвариант «две брони не пересекаются»,
 * а `UNIQUE(start)` — последний рубеж на случай гонки между процессами.
 */
export function createBooking(db: Db, input: CreateBookingInput): CreateBookingResult {
  const overlap = db.prepare(`SELECT 1 FROM bookings WHERE start < @end AND end > @start LIMIT 1`);
  const insert = db.prepare(
    `INSERT INTO bookings (event_type_id, start, end, guest_name, guest_email, created_at)
     VALUES (@eventTypeId, @start, @end, @guestName, @guestEmail, @createdAt)`,
  );

  const write = db.transaction((value: CreateBookingInput): CreateBookingResult => {
    if (overlap.get({ start: value.start, end: value.end }) !== undefined) {
      return { status: "conflict" };
    }
    const info = insert.run(value);
    return { status: "created", id: Number(info.lastInsertRowid) };
  });

  try {
    return write.immediate(input);
  } catch (error) {
    const code = sqliteCode(error);
    // Нарушение UNIQUE(start) по смыслу и есть конфликт, а не 500 (ADR-0007).
    if (code === "SQLITE_CONSTRAINT_UNIQUE") return { status: "conflict" };
    // Чужая транзакция не отпустила базу за timeout: перегрузка, а не конфликт.
    if (code === "SQLITE_BUSY") return { status: "busy" };
    throw error;
  }
}
