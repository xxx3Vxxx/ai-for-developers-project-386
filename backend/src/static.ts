import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { sendError } from "./errors.js";

/**
 * Корень статики фронта в проде (ADR-0014): собранный фронт (`frontend/dist`)
 * лежит рядом с собранным бекендом (`backend/dist`), поэтому путь считается
 * относительно расположения этого модуля — отдельной переменной окружения нет.
 */
export const defaultStaticRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../frontend/dist",
);

const INDEX_FILE = "index.html";
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/** `/api` и всё под ним — API, а не SPA-навигация (ADR-0014). */
function isApiPath(url: string): boolean {
  const path = url.split("?")[0];
  return path === "/api" || path.startsWith("/api/");
}

/** SPA-fallback только для навигационных `GET` вне `/api` (ADR-0014). */
function isSpaRequest(request: FastifyRequest): boolean {
  if (request.method !== "GET") return false;
  if (isApiPath(request.url)) return false;
  const accept = request.headers.accept;
  return typeof accept === "string" && accept.includes("text/html");
}

/**
 * Кэш-заголовки (ADR-0014): `index.html` — `no-cache` (на него указывает
 * SPA-fallback, хеша в имени нет), хешированные ассеты Vite (`/assets/*`) —
 * `immutable`.
 */
function setCacheHeaders(reply: FastifyReply, filePath: string): void {
  if (basename(filePath) === INDEX_FILE) {
    reply.header("cache-control", "no-cache");
    return;
  }
  if (basename(dirname(filePath)) === "assets") {
    reply.header("cache-control", IMMUTABLE_CACHE);
  }
}

/**
 * Отдаёт собранную статику фронта (`@fastify/static`) и размечает SPA-fallback
 * (ADR-0014): `GET` вне `/api` с `Accept: text/html` получает `index.html`
 * (200), всё прочее — конверт `404 NOT_FOUND` (ADR-0009). `/health` и `/api/*`
 * статикой не перехватываются.
 */
export function registerStatic(app: FastifyInstance, root: string = defaultStaticRoot): void {
  const hasIndex = existsSync(join(root, INDEX_FILE));

  app.register(fastifyStatic, {
    root,
    index: [INDEX_FILE],
    setHeaders: setCacheHeaders,
  });

  app.setNotFoundHandler((request, reply) => {
    if (hasIndex && isSpaRequest(request)) {
      reply.sendFile(INDEX_FILE);
      return;
    }
    sendError(reply, "NOT_FOUND");
  });
}
