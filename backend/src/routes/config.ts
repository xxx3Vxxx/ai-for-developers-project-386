import type { components } from "contracts";
import type { FastifyInstance } from "fastify";

import type { Config } from "../config.js";

type ServiceConfig = components["schemas"]["ServiceConfig"];

/**
 * Сегодняшняя дата в зоне сервиса как `YYYY-MM-DD` (ADR-0004).
 */
function todayInTimeZone(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * Регистрирует `GET /api/config` — мета-эндпоинт с зоной сервиса, рабочим
 * окном, окном записи и сегодняшней датой (ADR-0009).
 */
export function registerConfigRoutes(app: FastifyInstance, config: Config): void {
  app.get("/api/config", async (): Promise<ServiceConfig> => {
    return {
      timezone: config.serviceTimezone,
      workingWindow: { start: config.workDayStart, end: config.workDayEnd },
      bookingWindowDays: config.bookingWindowDays,
      today: todayInTimeZone(config.serviceTimezone, new Date()),
    };
  });
}
