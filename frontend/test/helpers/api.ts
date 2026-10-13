import type { components } from "contracts";
import { vi } from "vitest";

import type { ServiceConfig } from "../../src/api/config";

type EventType = components["schemas"]["EventType"];

/**
 * Мок сгенерированного клиента (`openapi-fetch`, ADR-0008) для компонентных
 * тестов. Тест подменяет модуль `src/api/client` этим моком:
 *
 * ```ts
 * vi.mock("../src/api/client", () => import("./helpers/api"));
 * ```
 *
 * Дальше ответы настраиваются через `api.GET` (например, `mockConfig`,
 * `mockEventTypes`), а между тестами состояние сбрасывается `resetApiMock()`.
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
 * Настраивает ответы `GET` по пути. Любой незамоканный `GET` — ошибка, чтобы
 * тест не молчал о забытом запросе.
 */
export function mockApi(routes: Record<string, unknown>): void {
  api.GET.mockImplementation(async (path: string) => {
    if (path in routes) return ok(routes[path]);
    throw new Error(`Незамоканный GET ${path}`);
  });
}

/** Настраивает `GET /api/config` на успешный ответ с заданной конфигурацией. */
export function mockConfig(config: ServiceConfig): void {
  mockApi({ "/api/config": config });
}

/** Настраивает `GET /api/event-types` на успешный ответ со списком типов. */
export function mockEventTypes(eventTypes: EventType[]): void {
  mockApi({ "/api/event-types": eventTypes });
}
