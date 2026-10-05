import Fastify, { type FastifyInstance } from "fastify";

/**
 * Собирает экземпляр приложения без запуска сервера.
 * Используется и в рантайме (`server.ts`), и в тестах.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}
