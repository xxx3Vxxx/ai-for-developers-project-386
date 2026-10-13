import Fastify, { type FastifyInstance } from "fastify";

import { loadConfig, type Config } from "./config.js";
import { createDb, type Db } from "./db.js";
import { registerErrorHandling } from "./errors.js";
import { registerConfigRoutes } from "./routes/config.js";
import { registerBookingRoutes } from "./routes/bookings.js";
import { registerEventTypeRoutes } from "./routes/event-types.js";
import { registerSlotRoutes } from "./routes/slots.js";
import { registerStatic } from "./static.js";

declare module "fastify" {
  interface FastifyInstance {
    /** Открытая база сервиса (ADR-0006); закрывается вместе с приложением. */
    db: Db;
  }
}

export interface BuildAppOptions {
  /** Конфигурация сервиса; по умолчанию читается из окружения (ADR-0013). */
  config?: Config;
  /** Готовая база; по умолчанию создаётся из `config.databasePath` (для тестов — `:memory:`). */
  db?: Db;
  /** Корень статики фронта; по умолчанию — `frontend/dist` (ADR-0014). */
  staticRoot?: string;
}

/**
 * Собирает экземпляр приложения без запуска сервера.
 * Используется и в рантайме (`server.ts`), и в тестах.
 */
export function buildApp({
  config = loadConfig(),
  db = createDb(config.databasePath),
  staticRoot,
}: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  app.decorate("db", db);
  app.addHook("onClose", async () => {
    db.close();
  });

  registerErrorHandling(app);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  registerConfigRoutes(app, config);
  registerEventTypeRoutes(app, config);
  registerSlotRoutes(app, config);
  registerBookingRoutes(app, config);

  registerStatic(app, staticRoot);

  return app;
}
