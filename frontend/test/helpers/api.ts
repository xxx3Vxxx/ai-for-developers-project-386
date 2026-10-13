import { vi } from "vitest";

import type { ServiceConfig } from "../../src/api/config";

/**
 * Мок сгенерированного клиента (`openapi-fetch`, ADR-0008) для компонентных
 * тестов. Тест подменяет модуль `src/api/client` этим моком:
 *
 * ```ts
 * vi.mock("../src/api/client", () => import("./helpers/api"));
 * ```
 *
 * Дальше ответы настраиваются через `api.GET` (например, `mockConfig`), а между
 * тестами состояние сбрасывается `resetApiMock()`.
 */
export const api = {
  GET: vi.fn(),
};

/** Сбрасывает вызовы и настройки мока клиента; вызывать в `beforeEach`. */
export function resetApiMock(): void {
  api.GET.mockReset();
}

/** Успешный ответ в форме, которую возвращает `openapi-fetch`. */
function ok<T>(data: T) {
  return { data, response: new Response(null, { status: 200 }) };
}

/**
 * Настраивает `GET /api/config` на успешный ответ с заданной конфигурацией.
 * Любой другой `GET` — ошибка, чтобы тест не молчал о незамоканном запросе.
 */
export function mockConfig(config: ServiceConfig): void {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/config") return ok(config);
    throw new Error(`Незамоканный GET ${path}`);
  });
}
