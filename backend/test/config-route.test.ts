import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

describe("GET /api/config", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("отдаёт дефолты, когда окружение пустое", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 13 октября 01:00 в Москве, хотя по UTC ещё 12 октября.
    vi.setSystemTime(new Date("2026-10-12T22:00:00.000Z"));

    const app = buildApp({ config: loadConfig({}) });
    try {
      const response = await app.inject({ method: "GET", url: "/api/config" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        timezone: "Europe/Moscow",
        workingWindow: { start: "09:00", end: "18:00" },
        bookingWindowDays: 14,
        today: "2026-10-13",
      });
    } finally {
      await app.close();
    }
  });

  it("отдаёт переопределения и считает today в зоне сервиса из окружения", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 13 октября 01:00 в Токио, но ещё 12 октября в Москве.
    vi.setSystemTime(new Date("2026-10-12T16:00:00.000Z"));

    const app = buildApp({
      config: loadConfig({
        SERVICE_TIMEZONE: "Asia/Tokyo",
        WORK_DAY_START: "10:00",
        WORK_DAY_END: "19:00",
        BOOKING_WINDOW_DAYS: "30",
      }),
    });
    try {
      const response = await app.inject({ method: "GET", url: "/api/config" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        timezone: "Asia/Tokyo",
        workingWindow: { start: "10:00", end: "19:00" },
        bookingWindowDays: 30,
        today: "2026-10-13",
      });
    } finally {
      await app.close();
    }
  });
});
