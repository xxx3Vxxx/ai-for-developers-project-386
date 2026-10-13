import Fastify, { type FastifyInstance } from "fastify";

import { loadConfig, type Config } from "./config.js";
import { registerConfigRoutes } from "./routes/config.js";

export interface BuildAppOptions {
  /** Конфигурация сервиса; по умолчанию читается из окружения (ADR-0013). */
  config?: Config;
}

/**
 * Собирает экземпляр приложения без запуска сервера.
 * Используется и в рантайме (`server.ts`), и в тестах.
 */
export function buildApp({ config = loadConfig() }: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  registerConfigRoutes(app, config);

  return app;
}
