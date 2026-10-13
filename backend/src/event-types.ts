import { sqliteErrorCode, type Db } from "./db.js";

/** Данные типа события, уже нормализованные и проверенные роутом. */
export interface CreateEventTypeInput {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  createdAt: number;
}

/** Исход попытки создания типа: успех или занятая база. */
export type CreateEventTypeResult = { status: "created" } | { status: "busy" };

/**
 * Вставляет новый тип события. Целостность держат CHECK-и схемы
 * (`duration_minutes` кратно 15 и положительно), поэтому отдельная транзакция не
 * нужна: вставка — одна инструкция. `SQLITE_BUSY` — чужая транзакция не отпустила
 * базу за timeout, то есть перегрузка, а не ошибка данных (ADR-0007).
 */
export function createEventType(db: Db, input: CreateEventTypeInput): CreateEventTypeResult {
  try {
    db.prepare(
      `INSERT INTO event_types (id, title, description, duration_minutes, created_at)
       VALUES (@id, @title, @description, @durationMinutes, @createdAt)`,
    ).run(input);
    return { status: "created" };
  } catch (error) {
    if (sqliteErrorCode(error) === "SQLITE_BUSY") return { status: "busy" };
    throw error;
  }
}
