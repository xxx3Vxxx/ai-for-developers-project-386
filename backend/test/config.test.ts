import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("применяет дефолты, когда переменные не заданы", () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      host: "0.0.0.0",
      databasePath: "./data/calendar.sqlite",
      serviceTimezone: "Europe/Moscow",
      workDayStart: "09:00",
      workDayEnd: "18:00",
      bookingWindowDays: 14,
    });
  });

  it("читает переопределения из окружения", () => {
    expect(
      loadConfig({
        PORT: "8080",
        HOST: "127.0.0.1",
        DATABASE_PATH: "/var/data/calendar.sqlite",
        SERVICE_TIMEZONE: "Asia/Tokyo",
        WORK_DAY_START: "10:30",
        WORK_DAY_END: "19:45",
        BOOKING_WINDOW_DAYS: "30",
      }),
    ).toEqual({
      port: 8080,
      host: "127.0.0.1",
      databasePath: "/var/data/calendar.sqlite",
      serviceTimezone: "Asia/Tokyo",
      workDayStart: "10:30",
      workDayEnd: "19:45",
      bookingWindowDays: 30,
    });
  });

  it("возвращает замороженный объект", () => {
    expect(Object.isFrozen(loadConfig({}))).toBe(true);
  });

  it.each([
    ["PORT", "abc"],
    ["PORT", "0"],
    ["PORT", "65536"],
    ["PORT", "3000.5"],
    ["HOST", ""],
    ["HOST", "   "],
    ["DATABASE_PATH", ""],
    ["DATABASE_PATH", "  "],
    ["SERVICE_TIMEZONE", "Mars/Phobos"],
    ["SERVICE_TIMEZONE", ""],
    ["WORK_DAY_START", "9:00"],
    ["WORK_DAY_START", "24:00"],
    ["WORK_DAY_END", "18:60"],
    ["BOOKING_WINDOW_DAYS", "0"],
    ["BOOKING_WINDOW_DAYS", "366"],
    ["BOOKING_WINDOW_DAYS", "two weeks"],
  ])("падает на некорректном значении %s=%o", (name, value) => {
    expect(() => loadConfig({ [name]: value })).toThrowError(new RegExp(name));
  });

  it("падает, когда начало рабочего окна не раньше конца", () => {
    expect(() => loadConfig({ WORK_DAY_START: "18:00", WORK_DAY_END: "09:00" })).toThrowError(
      /WORK_DAY/,
    );
    expect(() => loadConfig({ WORK_DAY_START: "09:00", WORK_DAY_END: "09:00" })).toThrowError(
      /WORK_DAY/,
    );
  });
});
