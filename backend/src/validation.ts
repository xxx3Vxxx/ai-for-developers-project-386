import { durationTooLargeMessage, fieldMessages } from "./messages.js";
import { hhmmToMinutes } from "./time.js";

/**
 * Ручной валидатор полей (ADR-0005), зеркало которого живёт на фронте
 * (`frontend/src/copy/fields.ts`, `frontend/src/validation.ts`). Правила порогов
 * и приоритетов — спецификация #2; правка порога трогает обе стороны.
 */
export interface FieldValidation<T> {
  /** Нормализованное значение: trim/нижний регистр, где применимо; при ошибке — дефолт. */
  value: T;
  /** Одно сообщение на поле; отсутствует, если поле валидно. */
  message?: string;
}

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;
const EMAIL_TOTAL_MAX = 254;
const EMAIL_LOCAL_MAX = 64;
const DURATION_STEP = 15;
const DURATION_MIN = 15;

/** Есть ли управляющие символы, включая переводы строк (запрещены в имени). */
function hasControlChars(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** Прагматичный email: local без пробелов и кавычек, домен с точкой и TLD ≥ 2. */
const EMAIL_LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/** ISO 8601 с секундами и смещением зоны либо `Z` (ADR-0004). */
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Длина рабочего окна в минутах; верхняя граница длительности (ADR-0003). */
export function workWindowMinutes(start: string, end: string): number {
  return hhmmToMinutes(end) - hhmmToMinutes(start);
}

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return typeof value === "string" && value.trim() === "";
}

function isEmail(value: string): boolean {
  const parts = value.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (local.length === 0 || local.length > EMAIL_LOCAL_MAX) return false;
  if (!EMAIL_LOCAL.test(local)) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((label) => DOMAIN_LABEL.test(label))) return false;

  return labels[labels.length - 1].length >= 2;
}

/** Имя: 1–100 символов после trim, без управляющих символов; регистр сохраняется. */
export function validateGuestName(value: unknown): FieldValidation<string> {
  if (isBlank(value)) return { value: "", message: fieldMessages.guestName.REQUIRED };
  if (typeof value !== "string")
    return { value: "", message: fieldMessages.guestName.INVALID_FORMAT };

  const trimmed = value.trim();
  if (trimmed.length > NAME_MAX)
    return { value: trimmed, message: fieldMessages.guestName.TOO_LONG };
  if (hasControlChars(trimmed)) {
    return { value: trimmed, message: fieldMessages.guestName.INVALID_FORMAT };
  }

  return { value: trimmed };
}

/** Email: ≤ 254 всего, local ≤ 64, формат; приводится к нижнему регистру. */
export function validateGuestEmail(value: unknown): FieldValidation<string> {
  if (isBlank(value)) return { value: "", message: fieldMessages.guestEmail.REQUIRED };
  if (typeof value !== "string")
    return { value: "", message: fieldMessages.guestEmail.INVALID_FORMAT };

  const normalized = value.trim().toLowerCase();
  const local = normalized.slice(0, Math.max(normalized.indexOf("@"), 0));
  const tooLong = normalized.length > EMAIL_TOTAL_MAX || local.length > EMAIL_LOCAL_MAX;

  if (tooLong) return { value: normalized, message: fieldMessages.guestEmail.TOO_LONG };
  if (!isEmail(normalized))
    return { value: normalized, message: fieldMessages.guestEmail.INVALID_FORMAT };

  return { value: normalized };
}

/** Название типа события: 1–100 символов после trim; регистр сохраняется. */
export function validateTitle(value: unknown): FieldValidation<string> {
  if (isBlank(value) || typeof value !== "string") {
    return { value: "", message: fieldMessages.title.REQUIRED };
  }

  const trimmed = value.trim();
  if (trimmed.length > NAME_MAX) return { value: trimmed, message: fieldMessages.title.TOO_LONG };

  return { value: trimmed };
}

/** Описание типа события: необязательно, дефолт `""`, ≤ 500 символов после trim. */
export function validateDescription(value: unknown): FieldValidation<string> {
  if (typeof value !== "string") return { value: "" };

  const trimmed = value.trim();
  if (trimmed.length > DESCRIPTION_MAX) {
    return { value: trimmed, message: fieldMessages.description.TOO_LONG };
  }

  return { value: trimmed };
}

/** Длительность: целое, кратно 15, от 15 до длины рабочего окна (ADR-0003). */
export function validateDurationMinutes(
  value: unknown,
  maxDurationMinutes: number,
): FieldValidation<number> {
  if (value === undefined || value === null) {
    return { value: DURATION_MIN, message: fieldMessages.durationMinutes.REQUIRED };
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { value: DURATION_MIN, message: fieldMessages.durationMinutes.INVALID_FORMAT };
  }
  if (value % DURATION_STEP !== 0) {
    return { value, message: fieldMessages.durationMinutes.NOT_MULTIPLE };
  }
  if (value < DURATION_MIN) {
    return { value, message: fieldMessages.durationMinutes.TOO_SMALL };
  }
  if (value > maxDurationMinutes) {
    return { value, message: durationTooLargeMessage(maxDurationMinutes) };
  }

  return { value };
}

/** Начало слота: строка ISO 8601 с секундами и смещением зоны (ADR-0004). */
export function validateStart(value: unknown): FieldValidation<string> {
  if (isBlank(value)) return { value: "", message: fieldMessages.start.REQUIRED };
  if (typeof value !== "string") return { value: "", message: fieldMessages.start.INVALID_FORMAT };
  if (!ISO_WITH_OFFSET.test(value) || Number.isNaN(Date.parse(value))) {
    return { value, message: fieldMessages.start.INVALID_FORMAT };
  }

  return { value };
}

/** Идентификатор типа события: непустая строка. */
export function validateEventTypeId(value: unknown): FieldValidation<string> {
  if (isBlank(value)) return { value: "", message: fieldMessages.eventTypeId.REQUIRED };
  if (typeof value !== "string") {
    return { value: "", message: fieldMessages.eventTypeId.INVALID_FORMAT };
  }

  return { value };
}
