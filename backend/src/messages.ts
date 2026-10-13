/**
 * Все русские тексты, обнаруженные сервером, живут здесь и только здесь
 * (ADR-0015): `errorMessages` — сообщения по машинным кодам, `fieldMessages` —
 * по-полевые сообщения по случаям. Канонический список строк — спецификация #2;
 * фронт держит посимвольное зеркало по-полевых текстов в `frontend/src/copy/fields.ts`.
 */
export const errorMessages = {
  VALIDATION_ERROR: "Некорректный формат запроса.",
  INVALID_SLOT: "Это время недоступно для записи.",
  DATE_OUT_OF_WINDOW: "Дата вне окна записи.",
  EVENT_TYPE_NOT_FOUND: "Тип события не найден.",
  NOT_FOUND: "Маршрут не найден.",
  CONFLICT: "Это время уже занято.",
  SERVICE_UNAVAILABLE: "Сервис временно недоступен. Попробуйте позже.",
  INTERNAL_ERROR: "Внутренняя ошибка сервера.",
} as const;

export type ErrorCode = keyof typeof errorMessages;

/**
 * Приоритет внутри поля — `REQUIRED` → `TOO_LONG` → `INVALID_FORMAT`, одно
 * сообщение на поле (ADR-0005). `TOO_LARGE` у длительности несёт `{N}` — длину
 * рабочего окна в часах из конфигурации (ADR-0003, ADR-0013).
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
