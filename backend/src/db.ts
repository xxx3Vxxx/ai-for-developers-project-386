import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

/** Путь к базе в памяти; используется в тестах. */
const IN_MEMORY = ":memory:";

/** Открытая база SQLite; передаётся в `buildApp({ db })`. */
export type Db = Database.Database;

/**
 * Схема создаётся идемпотентным SQL при старте, без миграций (ADR-0006).
 */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS event_types (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes % 15 = 0),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type_id TEXT NOT NULL REFERENCES event_types(id),
  -- start/end — моменты в UTC как epoch-миллисекунды (ADR-0004)
  start INTEGER NOT NULL,
  end INTEGER NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (end > start),
  UNIQUE (start)
);

CREATE INDEX IF NOT EXISTS idx_bookings_event_type_id ON bookings (event_type_id);
`;

/**
 * Предустановленные типы событий сеются фиксированными id через
 * `INSERT OR IGNORE` (ADR-0006); текст совпадает с прототипом (ADR-0015).
 */
const SEED_EVENT_TYPES = [
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
] as const;

function seedEventTypes(db: Db): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO event_types (id, title, description, duration_minutes, created_at)
     VALUES (@id, @title, @description, @durationMinutes, @createdAt)`,
  );
  const createdAt = Date.now();

  db.transaction(() => {
    for (const eventType of SEED_EVENT_TYPES) {
      insert.run({ ...eventType, createdAt });
    }
  })();
}

/**
 * Открывает базу и применяет схему. Каталог под файл создаётся при старте
 * (ADR-0013); `:memory:` используется в тестах.
 */
export function createDb(path: string): Db {
  if (path !== IN_MEMORY) {
    mkdirSync(dirname(path), { recursive: true });
  }

  // timeout: 1500 — ожидание чужой транзакции ограничено (ADR-0007).
  const db = new Database(path, { timeout: 1500 });
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  seedEventTypes(db);
  return db;
}
