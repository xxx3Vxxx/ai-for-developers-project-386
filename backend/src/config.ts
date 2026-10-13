/**
 * Конфигурация сервиса (ADR-0013): читается один раз из переменных окружения,
 * валидируется и замораживается. Дефолт применяется только к незаданной
 * переменной; некорректное значение роняет старт, отката к дефолту нет.
 */
export interface Config {
  port: number;
  host: string;
  databasePath: string;
  serviceTimezone: string;
  workDayStart: string;
  workDayEnd: string;
  bookingWindowDays: number;
}

type Env = NodeJS.ProcessEnv;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const INTEGER_PATTERN = /^\d+$/;

const IANA_EXPECTED = "IANA-зона (например, Europe/Moscow)";

function invalid(name: string, expected: string, value: string): never {
  throw new Error(
    `Некорректное значение ${name}: ожидается ${expected}, получено ${JSON.stringify(value)}`,
  );
}

function readString(env: Env, name: string, fallback: string, expected: string): string {
  const raw = env[name];
  if (raw === undefined) return fallback;
  if (raw.trim() === "") invalid(name, expected, raw);
  return raw;
}

function readInteger(
  env: Env,
  name: string,
  fallback: number,
  min: number,
  max: number,
  expected: string,
): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  if (!INTEGER_PATTERN.test(raw)) invalid(name, expected, raw);
  const value = Number(raw);
  if (value < min || value > max) invalid(name, expected, raw);
  return value;
}

function readTime(env: Env, name: string, fallback: string): string {
  const raw = env[name];
  if (raw === undefined) return fallback;
  if (!TIME_PATTERN.test(raw)) invalid(name, "время в формате HH:MM (24 ч)", raw);
  return raw;
}

function readTimezone(env: Env, name: string, fallback: string): string {
  const raw = env[name];
  if (raw === undefined) return fallback;
  if (raw === "") invalid(name, IANA_EXPECTED, raw);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
  } catch {
    invalid(name, IANA_EXPECTED, raw);
  }
  return raw;
}

export function loadConfig(env: Env = process.env): Config {
  const workDayStart = readTime(env, "WORK_DAY_START", "09:00");
  const workDayEnd = readTime(env, "WORK_DAY_END", "18:00");

  if (workDayStart >= workDayEnd) {
    throw new Error(
      `Некорректное значение WORK_DAY_START/WORK_DAY_END: начало рабочего окна (${workDayStart}) должно быть раньше конца (${workDayEnd})`,
    );
  }

  return Object.freeze({
    port: readInteger(env, "PORT", 3000, 1, 65535, "целое число 1–65535"),
    host: readString(env, "HOST", "0.0.0.0", "непустая строка"),
    databasePath: readString(env, "DATABASE_PATH", "./data/calendar.sqlite", "непустой путь"),
    serviceTimezone: readTimezone(env, "SERVICE_TIMEZONE", "Europe/Moscow"),
    workDayStart,
    workDayEnd,
    bookingWindowDays: readInteger(
      env,
      "BOOKING_WINDOW_DAYS",
      14,
      1,
      365,
      "целое число 1–365",
    ),
  });
}
