// PROTOTYPE — throwaway. Mock data for the /book wizard exploration (issue #11).
// Backend API (#9, #10) is not implemented yet, so nothing here talks to the network.

export type EventType = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
};

export type Slot = {
  /** "HH:MM", local to the service zone */
  start: string;
  end: string;
  available: boolean;
};

export type Booking = {
  eventType: EventType;
  date: string;
  start: string;
  end: string;
  guestName: string;
  guestEmail: string;
};

export const serviceTimezone = "Europe/Moscow";
export const workingStartMinutes = 9 * 60; // 09:00
export const workingEndMinutes = 18 * 60; // 18:00
export const bookingWindowDays = 14;

export const eventTypes: EventType[] = [
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
];

/** Mocked "today" so the prototype is deterministic: Monday, 12 Oct 2026. */
export const todayISO = "2026-10-12";
/** Mocked clock inside today, for past-slot handling. */
const nowMinutes = 12 * 60;

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const windowDates: string[] = Array.from({ length: bookingWindowDays }, (_, i) =>
  addDays(todayISO, i),
);

export function isInWindow(iso: string): boolean {
  return windowDates.includes(iso);
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dayIndex(date: string): number {
  return windowDates.indexOf(date);
}

/** Deterministic pseudo-occupancy: the same day always looks the same. */
function isBusy(date: string, slotIndex: number): boolean {
  const d = dayIndex(date);
  if (d < 0) return false;
  const daySeed = d * 7 + ((d * d) % 5);
  return (daySeed + slotIndex * 3) % 7 < 2;
}

export function slotsFor(eventType: EventType, date: string): Slot[] {
  const dur = eventType.durationMinutes;
  const out: Slot[] = [];
  let i = 0;
  for (let start = workingStartMinutes; start + dur <= workingEndMinutes; start += dur, i++) {
    const past = date === todayISO && start <= nowMinutes;
    out.push({
      start: minutesToHHMM(start),
      end: minutesToHHMM(start + dur),
      available: !past && !isBusy(date, i),
    });
  }
  return out;
}

// --- date formatting (ru, service zone) ---

function asDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

const ruDayShort = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const ruWeekday = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", weekday: "short" });
const ruMonthYear = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const ruLong = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  weekday: "short",
});

export const formatDayShort = (iso: string) => ruDayShort.format(asDate(iso)).replace(".", "");
export const formatWeekday = (iso: string) => ruWeekday.format(asDate(iso));
export const formatMonthYear = (iso: string) => ruMonthYear.format(asDate(iso));
export const formatLong = (iso: string) => ruLong.format(asDate(iso));

export const weekdayHeaders = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Monday-first month grid. `null` cells are leading blanks before day 1. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10));
  }
  return cells;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export function demoBooking(partial?: Partial<Booking>): Booking {
  const eventType = partial?.eventType ?? eventTypes[1];
  const date = partial?.date ?? windowDates[2];
  const start = partial?.start ?? "14:00";
  const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
  return {
    eventType,
    date,
    start,
    end: minutesToHHMM(startMinutes + eventType.durationMinutes),
    guestName: partial?.guestName ?? "Иван Петров",
    guestEmail: partial?.guestEmail ?? "ivan@example.com",
  };
}
