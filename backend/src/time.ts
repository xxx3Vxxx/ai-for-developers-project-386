/**
 * «Настенное» время зоны сервиса (ADR-0004): календарные сутки, моменты и
 * смещения считаются через `Intl`, без хардкода смещений.
 */

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** «HH:MM» → минуты от полуночи. */
export function hhmmToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatters.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, cached);
  }
  return cached;
}

function zonedParts(timeZone: string, instant: Date): ZonedParts {
  const parts = formatter(timeZone).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Смещение зоны от UTC в минутах на данный момент. */
function offsetMinutes(timeZone: string, instant: Date): number {
  const parts = zonedParts(timeZone, instant);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const instantSecond = Math.floor(instant.getTime() / 1000) * 1000;
  return (asUtc - instantSecond) / 60_000;
}

/** Локальная дата зоны сервиса как `YYYY-MM-DD` (ADR-0004). */
export function dateInTimeZone(timeZone: string, instant: Date): string {
  const parts = zonedParts(timeZone, instant);
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** Момент → ISO 8601 со смещением зоны сервиса (ADR-0004). */
export function toZonedIso(timeZone: string, instant: Date): string {
  const parts = zonedParts(timeZone, instant);
  const offset = offsetMinutes(timeZone, instant);
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  const date = `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
  const time = `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
  return `${date}T${time}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/**
 * Настенное время (`date` + минуты от полуночи) в зоне сервиса → UTC-момент.
 * Смещение уточняется дважды, чтобы переход на летнее время не сдвинул момент.
 */
export function zonedWallClockToInstant(
  timeZone: string,
  date: string,
  minutesFromMidnight: number,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const wallAsUtc = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

  const firstOffset = offsetMinutes(timeZone, new Date(wallAsUtc));
  let instant = wallAsUtc - firstOffset * 60_000;
  const secondOffset = offsetMinutes(timeZone, new Date(instant));
  if (secondOffset !== firstOffset) {
    instant = wallAsUtc - secondOffset * 60_000;
  }
  return new Date(instant);
}

/** Календарная дата `YYYY-MM-DD`, существующая в календаре (включая 29 февраля). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Календарная дата ± `days` суток; чистая арифметика над `YYYY-MM-DD`. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}
