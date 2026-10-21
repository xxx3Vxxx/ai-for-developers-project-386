import type { ServiceConfig } from "contracts/types";
import type { FastifyInstance } from "fastify";

import type { Config } from "../config.js";
import { dateInTimeZone } from "../time.js";

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
      today: dateInTimeZone(config.serviceTimezone, new Date()),
    };
  });
}
