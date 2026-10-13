/**
 * Зеркало по-полевых текстов бекенда — `backend/src/messages.ts` (`fieldMessages`).
 * Это единственное разрешённое дублирование строк между сторонами (ADR-0015):
 * меняешь строку здесь — меняй и там, обе стороны пиннят свои литералы в тестах.
 * Канонический список — спецификация #2.
 */
export const fieldMessages = {
  guestName: {
    REQUIRED: "Укажите имя",
    TOO_LONG: "Не больше 100 символов",
    INVALID_FORMAT: "Недопустимые символы",
  },
  guestEmail: {
    REQUIRED: "Укажите email",
    TOO_LONG: "Слишком длинный email",
    INVALID_FORMAT: "Некорректный email",
  },
  start: {
    REQUIRED: "Выберите время",
    INVALID_FORMAT: "Некорректное время",
  },
  date: {
    REQUIRED: "Выберите дату",
    INVALID_FORMAT: "Некорректная дата",
  },
  eventTypeId: {
    REQUIRED: "Выберите тип события",
    INVALID_FORMAT: "Некорректный тип события",
  },
  title: {
    REQUIRED: "Укажите название",
    TOO_LONG: "Не больше 100 символов",
  },
  description: {
    TOO_LONG: "Не больше 500 символов",
  },
  durationMinutes: {
    REQUIRED: "Укажите длительность",
    INVALID_FORMAT: "Целое число минут",
    NOT_MULTIPLE: "Кратна 15 минутам",
    TOO_SMALL: "Не короче 15 минут",
    TOO_LARGE: "Не длиннее рабочего окна ({N} ч)",
  },
} as const;

/** Подставляет длину рабочего окна в часах в текст `durationMinutes.TOO_LARGE`. */
export function durationTooLargeMessage(maxDurationMinutes: number): string {
  const hours = maxDurationMinutes / 60;
  return fieldMessages.durationMinutes.TOO_LARGE.replace("{N}", String(hours));
}
