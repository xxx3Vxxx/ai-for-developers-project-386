/**
 * Форматирование календарных дат (`YYYY-MM-DD` зоны сервиса) для интерфейса.
 * Даты — «настенные» сутки без времени, поэтому арифметика идёт в UTC: так
 * результат не зависит от зоны машины гостя (ADR-0004).
 */

const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;

function toUtcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Календарная дата ± `days` суток. */
export function addDays(date: string, days: number): string {
  const shifted = toUtcDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Непрерывный ряд дат длиной `days`, начиная с `start` включительно. */
export function dateRange(start: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDays(start, index));
}

/** Число месяца без ведущего нуля: «4». */
export function dayNumber(date: string): string {
  return String(toUtcDate(date).getUTCDate());
}

/** Короткое название дня недели: «ср». */
export function weekdayShort(date: string): string {
  return WEEKDAYS_SHORT[toUtcDate(date).getUTCDay()];
}

/** Дата без года: «14 октября». */
export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(toUtcDate(date));
}

/** Дата с днём недели: «14 октября, среда». */
export function fullDateLabel(date: string): string {
  const weekday = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    timeZone: "UTC",
  }).format(toUtcDate(date));
  return `${dateLabel(date)}, ${weekday}`;
}
