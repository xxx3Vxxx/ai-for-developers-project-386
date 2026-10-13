import { describe, expect, it } from "vitest";

import { durationTooLargeMessage, fieldMessages } from "../src/copy/fields";
import {
  validateDescription,
  validateDurationMinutes,
  validateEventTypeId,
  validateGuestEmail,
  validateGuestName,
  validateStart,
  validateTitle,
  workWindowMinutes,
} from "../src/validation";

describe("copy/fields", () => {
  it("повторяет по-полевые тексты бекенда посимвольно (ADR-0015)", () => {
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
  });
});

describe("зеркальная валидация полей", () => {
  const messages = fieldMessages;

  it("имя: приоритет REQUIRED → TOO_LONG → INVALID_FORMAT", () => {
    expect(validateGuestName("   ").message).toBe(messages.guestName.REQUIRED);
    expect(validateGuestName(`\n${"я".repeat(101)}`).message).toBe(messages.guestName.TOO_LONG);
    expect(validateGuestName("Имя\nФамилия").message).toBe(messages.guestName.INVALID_FORMAT);
  });

  it("имя: отклоняет C1 и разделители строк U+2028/U+2029", () => {
    expect(validateGuestName("Имя\u0085Фамилия").message).toBe(messages.guestName.INVALID_FORMAT);
    expect(validateGuestName("Имя\u2028Фамилия").message).toBe(messages.guestName.INVALID_FORMAT);
  });

  it("имя: регистр и внутренние пробелы сохраняются, края обрезаются", () => {
    expect(validateGuestName("  Иван  Петров ")).toEqual({ value: "Иван  Петров" });
  });

  it("email: нормализуется к нижнему регистру и валидируется прагматично", () => {
    expect(validateGuestEmail("  Guest+Tag@Example.COM ")).toEqual({
      value: "guest+tag@example.com",
    });
    expect(validateGuestEmail("a@example").message).toBe(messages.guestEmail.INVALID_FORMAT);
    expect(validateGuestEmail(`${"a".repeat(65)}@example.com`).message).toBe(
      messages.guestEmail.TOO_LONG,
    );
    expect(validateGuestEmail("").message).toBe(messages.guestEmail.REQUIRED);
  });

  it("название: обязательное, 1–100 после trim", () => {
    expect(validateTitle("  ").message).toBe(messages.title.REQUIRED);
    expect(validateTitle("т".repeat(101)).message).toBe(messages.title.TOO_LONG);
    expect(validateTitle("  Демо-звонок ")).toEqual({ value: "Демо-звонок" });
  });

  it("описание: необязательно, ≤ 500 после trim", () => {
    expect(validateDescription(undefined)).toEqual({ value: "" });
    expect(validateDescription("о".repeat(501)).message).toBe(messages.description.TOO_LONG);
  });

  it("длительность: целое, кратно 15, от 15 до длины окна", () => {
    const max = workWindowMinutes("09:00", "18:00");
    expect(validateDurationMinutes(undefined, max).message).toBe(messages.durationMinutes.REQUIRED);
    expect(validateDurationMinutes(12.5, max).message).toBe(
      messages.durationMinutes.INVALID_FORMAT,
    );
    expect(validateDurationMinutes(20, max).message).toBe(messages.durationMinutes.NOT_MULTIPLE);
    expect(validateDurationMinutes(0, max).message).toBe(messages.durationMinutes.TOO_SMALL);
    expect(validateDurationMinutes(555, max).message).toBe("Не длиннее рабочего окна (9 ч)");
    expect(validateDurationMinutes(540, max)).toEqual({ value: 540 });
  });

  it("время слота: ISO 8601 со смещением зоны", () => {
    expect(validateStart("").message).toBe(messages.start.REQUIRED);
    expect(validateStart("09:00").message).toBe(messages.start.INVALID_FORMAT);
    expect(validateStart("2026-10-13T09:00:00+03:00")).toEqual({
      value: "2026-10-13T09:00:00+03:00",
    });
  });

  it("идентификатор типа события: непустая строка", () => {
    expect(validateEventTypeId("").message).toBe(messages.eventTypeId.REQUIRED);
    expect(validateEventTypeId(15).message).toBe(messages.eventTypeId.INVALID_FORMAT);
    expect(validateEventTypeId("et-15")).toEqual({ value: "et-15" });
  });
});
