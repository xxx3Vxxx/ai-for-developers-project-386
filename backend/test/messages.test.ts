import { describe, expect, it } from "vitest";

import { durationTooLargeMessage, errorMessages, fieldMessages } from "../src/messages.js";

describe("errorMessages", () => {
  it("содержит ровно 8 сообщений по кодам (ADR-0005, ADR-0015)", () => {
    expect(errorMessages).toEqual({
      VALIDATION_ERROR: "Некорректный формат запроса.",
      INVALID_SLOT: "Это время недоступно для записи.",
      DATE_OUT_OF_WINDOW: "Дата вне окна записи.",
      EVENT_TYPE_NOT_FOUND: "Тип события не найден.",
      NOT_FOUND: "Маршрут не найден.",
      CONFLICT: "Это время уже занято.",
      SERVICE_UNAVAILABLE: "Сервис временно недоступен. Попробуйте позже.",
      INTERNAL_ERROR: "Внутренняя ошибка сервера.",
    });
  });
});

describe("fieldMessages", () => {
  it("пиннит по-полевые тексты (канонический список — спецификация #2)", () => {
    expect(fieldMessages).toEqual({
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
    });
  });

  it("подставляет длину рабочего окна в текст TOO_LARGE", () => {
    expect(durationTooLargeMessage(9 * 60)).toBe("Не длиннее рабочего окна (9 ч)");
    expect(durationTooLargeMessage(8 * 60)).toBe("Не длиннее рабочего окна (8 ч)");
  });
});
