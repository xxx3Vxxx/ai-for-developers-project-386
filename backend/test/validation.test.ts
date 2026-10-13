import { describe, expect, it } from "vitest";

import { fieldMessages } from "../src/messages.js";
import {
  validateDescription,
  validateDurationMinutes,
  validateEventTypeId,
  validateGuestEmail,
  validateGuestName,
  validateStart,
  validateTitle,
  workWindowMinutes,
} from "../src/validation.js";

const messages = fieldMessages;

describe("валидация имени гостя", () => {
  it.each([undefined, null, "", "   "])("REQUIRED на пустом значении %o", (value) => {
    expect(validateGuestName(value).message).toBe(messages.guestName.REQUIRED);
  });

  it("TOO_LONG на значении длиннее 100 символов после trim", () => {
    expect(validateGuestName(`  ${"я".repeat(101)}  `).message).toBe(messages.guestName.TOO_LONG);
    expect(validateGuestName("я".repeat(101)).message).toBe(messages.guestName.TOO_LONG);
  });

  it("INVALID_FORMAT на управляющих символах и переводах строк", () => {
    expect(validateGuestName("Имя\nФамилия").message).toBe(messages.guestName.INVALID_FORMAT);
    expect(validateGuestName("Имя\u0007").message).toBe(messages.guestName.INVALID_FORMAT);
    expect(validateGuestName(42).message).toBe(messages.guestName.INVALID_FORMAT);
  });

  it("приоритет: TOO_LONG важнее INVALID_FORMAT", () => {
    expect(validateGuestName(`\n${"я".repeat(101)}`).message).toBe(messages.guestName.TOO_LONG);
  });

  it("сохраняет регистр и внутренние пробелы, обрезая края", () => {
    expect(validateGuestName("  Иван  Петров ")).toEqual({ value: "Иван  Петров" });
  });
});

describe("валидация email гостя", () => {
  it.each([undefined, null, "", "   "])("REQUIRED на пустом значении %o", (value) => {
    expect(validateGuestEmail(value).message).toBe(messages.guestEmail.REQUIRED);
  });

  it("TOO_LONG покрывает оба лимита и идёт раньше формата", () => {
    const longLocal = `${"a".repeat(65)}@example.com`;
    const longTotal = `${"a".repeat(10)}@${"b".repeat(60)}.${"c".repeat(60)}.${"d".repeat(60)}.${"e".repeat(60)}.com`;

    expect(validateGuestEmail(longLocal).message).toBe(messages.guestEmail.TOO_LONG);
    expect(validateGuestEmail(longTotal).message).toBe(messages.guestEmail.TOO_LONG);
    expect(longLocal.length).toBeGreaterThan(64);
    expect(longTotal.length).toBeGreaterThan(254);
  });

  it.each([
    "no-at.example.com",
    "a@@example.com",
    "@example.com",
    "a@example",
    "a@.com",
    "a@example.c",
    "a b@example.com",
    "a@exa mple.com",
    "«a»@example.com",
  ])("INVALID_FORMAT на %o", (value) => {
    expect(validateGuestEmail(value).message).toBe(messages.guestEmail.INVALID_FORMAT);
  });

  it("приводится к нижнему регистру и обрезается", () => {
    expect(validateGuestEmail("  Guest+Tag@Example.COM ")).toEqual({
      value: "guest+tag@example.com",
    });
  });

  it("разрешает поддомены и плюс в local", () => {
    expect(validateGuestEmail("a+b@mail.corp.example.io")).toEqual({
      value: "a+b@mail.corp.example.io",
    });
  });
});

describe("валидация названия типа события", () => {
  it.each([undefined, null, "", "  ", 5])("REQUIRED на %o", (value) => {
    expect(validateTitle(value).message).toBe(messages.title.REQUIRED);
  });

  it("TOO_LONG на значении длиннее 100 символов", () => {
    expect(validateTitle("т".repeat(101)).message).toBe(messages.title.TOO_LONG);
  });

  it("обрезает края, сохраняя регистр", () => {
    expect(validateTitle("  Демо-звонок ")).toEqual({ value: "Демо-звонок" });
  });
});

describe("валидация описания типа события", () => {
  it("отсутствующее описание — пустая строка без ошибки", () => {
    expect(validateDescription(undefined)).toEqual({ value: "" });
    expect(validateDescription(null)).toEqual({ value: "" });
  });

  it("TOO_LONG на значении длиннее 500 символов", () => {
    expect(validateDescription("о".repeat(501)).message).toBe(messages.description.TOO_LONG);
  });

  it("обрезает края", () => {
    expect(validateDescription("  Детали  ")).toEqual({ value: "Детали" });
  });
});

describe("валидация длительности типа события", () => {
  const max = workWindowMinutes("09:00", "18:00");

  it.each([undefined, null])("REQUIRED на %o", (value) => {
    expect(validateDurationMinutes(value, max).message).toBe(messages.durationMinutes.REQUIRED);
  });

  it.each(["15", 12.5, Number.NaN])("INVALID_FORMAT на %o", (value) => {
    expect(validateDurationMinutes(value, max).message).toBe(
      messages.durationMinutes.INVALID_FORMAT,
    );
  });

  it("NOT_MULTIPLE на значении, не кратном 15", () => {
    expect(validateDurationMinutes(7, max).message).toBe(messages.durationMinutes.NOT_MULTIPLE);
    expect(validateDurationMinutes(20, max).message).toBe(messages.durationMinutes.NOT_MULTIPLE);
  });

  it("TOO_SMALL на значении меньше 15", () => {
    expect(validateDurationMinutes(0, max).message).toBe(messages.durationMinutes.TOO_SMALL);
    expect(validateDurationMinutes(-15, max).message).toBe(messages.durationMinutes.TOO_SMALL);
  });

  it("TOO_LARGE на значении длиннее рабочего окна, с числом часов из окна", () => {
    expect(validateDurationMinutes(555, max).message).toBe("Не длиннее рабочего окна (9 ч)");
  });

  it("принимает граничные значения 15 и длину окна", () => {
    expect(validateDurationMinutes(15, max)).toEqual({ value: 15 });
    expect(validateDurationMinutes(max, max)).toEqual({ value: max });
  });
});

describe("валидация времени слота", () => {
  it.each([undefined, null, "", 5])("REQUIRED/INVALID на %o", (value) => {
    const result = validateStart(value);
    expect(result.message).toBe(
      typeof value === "string" || value === undefined || value === null
        ? messages.start.REQUIRED
        : messages.start.INVALID_FORMAT,
    );
  });

  it.each(["13.10.2026 09:00", "2026-10-13", "2026-13-13T09:00:00+03:00", "09:00"])(
    "INVALID_FORMAT на %o",
    (value) => {
      expect(validateStart(value).message).toBe(messages.start.INVALID_FORMAT);
    },
  );

  it("принимает ISO 8601 со смещением зоны", () => {
    expect(validateStart("2026-10-13T09:00:00+03:00")).toEqual({
      value: "2026-10-13T09:00:00+03:00",
    });
    expect(validateStart("2026-10-13T09:00:00Z")).toEqual({ value: "2026-10-13T09:00:00Z" });
  });
});

describe("валидация идентификатора типа события", () => {
  it.each([undefined, null, ""])("REQUIRED на %o", (value) => {
    expect(validateEventTypeId(value).message).toBe(messages.eventTypeId.REQUIRED);
  });

  it("INVALID_FORMAT на не-строке", () => {
    expect(validateEventTypeId(15).message).toBe(messages.eventTypeId.INVALID_FORMAT);
  });

  it("принимает непустую строку", () => {
    expect(validateEventTypeId("et-15")).toEqual({ value: "et-15" });
  });
});

describe("workWindowMinutes", () => {
  it("считает длину рабочего окна в минутах", () => {
    expect(workWindowMinutes("09:00", "18:00")).toBe(540);
    expect(workWindowMinutes("10:30", "19:45")).toBe(555);
  });
});
