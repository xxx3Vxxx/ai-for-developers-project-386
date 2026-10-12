// PROTOTYPE — throwaway. Mock data and helpers for the /admin exploration (issue #12).
// The backend (#9, #10) is not implemented yet, so nothing here talks to the network.
// Delete this whole folder once a variant is chosen.

export type EventType = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
};

export type Booking = {
  id: string;
  eventTypeId: string;
  eventTypeTitle: string;
  /** ISO 8601 with the service-zone offset */
  start: string;
  end: string;
  guestName: string;
  guestEmail: string;
};

export type EventTypeDraft = {
  title: string;
  description: string;
  durationMinutes: number;
};

export type FieldErrors = {
  title?: string;
  description?: string;
  durationMinutes?: string;
};

export type CreateResult = { ok: true; eventType: EventType } | { ok: false; fields: FieldErrors };

export const serviceTimezone = "Europe/Moscow";
export const serviceOffset = "+03:00";
export const workingStartMinutes = 9 * 60; // 09:00
export const workingEndMinutes = 18 * 60; // 18:00
export const workingWindowMinutes = workingEndMinutes - workingStartMinutes; // 540
export const bookingWindowDays = 14;

/** Pinned "today" so the prototype is deterministic: Monday, 12 Oct 2026. */
export const todayISO = "2026-10-12";
/** Pinned clock, for the in-progress booking and relative labels. */
export const nowISO = `${todayISO}T12:00:00${serviceOffset}`;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

export const emptyDraft: EventTypeDraft = { title: "", description: "", durationMinutes: 30 };

/** A deliberately invalid draft, for the ?state=invalid walkthrough. */
export const invalidDraft: EventTypeDraft = {
  title: "",
  description: "х".repeat(501),
  durationMinutes: 7,
};

/** A demo type that "appears" after a successful create, for the ?state=success walkthrough. */
export const createdDemo: EventType = {
  id: "et-demo",
  title: "Демо-звонок",
  description: "Показ продукта и ответы на вопросы.",
  durationMinutes: 45,
};

export const initialEventTypes: EventType[] = [
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

function moment(date: string, time: string): string {
  return `${date}T${time}:00${serviceOffset}`;
}

/** Sorted by `start` asc, as `GET /api/bookings` promises. */
export const initialBookings: Booking[] = [
  {
    id: "b-1",
    eventTypeId: "et-30",
    eventTypeTitle: "Стандартная встреча",
    start: moment("2026-10-12", "11:45"),
    end: moment("2026-10-12", "12:15"),
    guestName: "Иван Петров",
    guestEmail: "ivan.petrov@example.com",
  },
  {
    id: "b-2",
    eventTypeId: "et-15",
    eventTypeTitle: "Короткий звонок",
    start: moment("2026-10-12", "14:00"),
    end: moment("2026-10-12", "14:15"),
    guestName: "Мария Соколова",
    guestEmail: "m.sokolova@example.com",
  },
  {
    id: "b-3",
    eventTypeId: "et-30",
    eventTypeTitle: "Стандартная встреча",
    start: moment("2026-10-12", "16:30"),
    end: moment("2026-10-12", "17:00"),
    guestName: "Пётр Ким",
    guestEmail: "petr.kim@example.com",
  },
  {
    id: "b-4",
    eventTypeId: "et-30",
    eventTypeTitle: "Стандартная встреча",
    start: moment("2026-10-13", "10:00"),
    end: moment("2026-10-13", "10:30"),
    guestName: "Анна Громова",
    guestEmail: "anna.gromova@example.com",
  },
  {
    id: "b-5",
    eventTypeId: "et-15",
    eventTypeTitle: "Короткий звонок",
    start: moment("2026-10-14", "09:15"),
    end: moment("2026-10-14", "09:30"),
    guestName: "Сергей Волков",
    guestEmail: "s.volkov@example.com",
  },
  {
    id: "b-6",
    eventTypeId: "et-30",
    eventTypeTitle: "Стандартная встреча",
    start: moment("2026-10-16", "13:00"),
    end: moment("2026-10-16", "13:30"),
    guestName: "Ольга Лебедева",
    guestEmail: "olga.lebedeva@example.com",
  },
];

// --- validation (mirrors ADR-0010; the backend is the source of truth) ---

export function validateEventTypeDraft(draft: EventTypeDraft): FieldErrors {
  const fields: FieldErrors = {};

  const title = draft.title.trim();
  if (title.length === 0) fields.title = "Укажите название";
  else if (title.length > 100) fields.title = "Не больше 100 символов";

  if (draft.description.trim().length > 500) fields.description = "Не больше 500 символов";

  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 15) {
    fields.durationMinutes = "Не короче 15 минут";
  } else if (draft.durationMinutes % 15 !== 0) {
    fields.durationMinutes = "Кратна 15 минутам";
  } else if (draft.durationMinutes > workingWindowMinutes) {
    fields.durationMinutes = "Не длиннее рабочего окна (9 ч)";
  }

  return fields;
}

// --- formatting (ru, service zone) ---

function dayStart(date: string): Date {
  return new Date(`${date}T00:00:00${serviceOffset}`);
}

export function dayOf(momentISO: string): string {
  return momentISO.slice(0, 10);
}

export function formatTime(momentISO: string): string {
  return momentISO.slice(11, 16);
}

export function formatTimeRange(booking: Booking): string {
  return `${formatTime(booking.start)}–${formatTime(booking.end)}`;
}

export function durationMinutesOf(booking: Booking): number {
  return Math.round((Date.parse(booking.end) - Date.parse(booking.start)) / 60_000);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

const ruDayLong = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: serviceTimezone,
});
const ruDayShort = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  timeZone: serviceTimezone,
});
const ruWeekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: serviceTimezone });

export const formatDayLong = (date: string) => ruDayLong.format(dayStart(date));
export const formatDayShort = (date: string) => ruDayShort.format(dayStart(date)).replace(".", "");
export const formatWeekday = (date: string) => ruWeekday.format(dayStart(date));

function dayDiff(date: string): number {
  const target = Date.parse(`${date}T00:00:00${serviceOffset}`);
  const today = Date.parse(`${todayISO}T00:00:00${serviceOffset}`);
  return Math.round((target - today) / 86_400_000);
}

export function dayLabel(date: string): string {
  const diff = dayDiff(date);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  if (diff === 2) return "Послезавтра";
  return formatDayLong(date);
}

export function groupByDay(bookings: Booking[]): { date: string; items: Booking[] }[] {
  const groups = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const key = dayOf(booking.start);
    const list = groups.get(key);
    if (list) list.push(booking);
    else groups.set(key, [booking]);
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }));
}

/** A booking is "ongoing" when the pinned clock sits inside it (ADR-0009: end > now). */
export function isOngoing(booking: Booking): boolean {
  return booking.start <= nowISO && booking.end > nowISO;
}
