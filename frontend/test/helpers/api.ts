import type { components } from "contracts";
import { vi } from "vitest";

import type { ServiceConfig } from "../../src/api/config";

type EventType = components["schemas"]["EventType"];
type SlotsResponse = components["schemas"]["SlotsResponse"];

/**
 * Мок сгенерированного клиента (`openapi-fetch`, ADR-0008) для компонентных
 * тестов. Тест подменяет модуль `src/api/client` этим моком:
 *
 * ```ts
 * vi.mock("../src/api/client", () => import("./helpers/api"));
 * ```
 *
 * Дальше ответы настраиваются через `api.GET` (например, `mockConfig`,
 * `mockEventTypes`, `mockSlots`) либо напрямую через `api.GET.mockImplementation`,
 * а между тестами состояние сбрасывается `resetApiMock()`.
 */
export const api = {
  GET: vi.fn(),
  POST: vi.fn(),
};

/** Сбрасывает вызовы и настройки мока клиента; вызывать в `beforeEach`. */
export function resetApiMock(): void {
  api.GET.mockReset();
  api.POST.mockReset();
}

/** Успешный ответ в форме, которую возвращает `openapi-fetch`. */
export function mockResponse<T>(data: T) {
  return { data, response: new Response(null, { status: 200 }) };
}

/**
 * Ошибочный ответ в форме `openapi-fetch`: `error` — разобранный конверт
 * `{ error: { code, message, fields? } }` (ADR-0005), `response` — статус.
 */
export function mockErrorResponse(
  code: string,
  message: string,
  status = 400,
  fields?: Record<string, string>,
) {
  return {
    error: { error: { code, message, ...(fields ? { fields } : {}) } },
    response: new Response(null, { status }),
  };
}

/**
 * Настраивает ответы `GET` по пути. Любой незамоканный `GET` — ошибка, чтобы
 * тест не молчал о забытом запросе.
 */
export function mockApi(routes: Record<string, unknown>): void {
  api.GET.mockImplementation(async (path: string) => {
    if (path in routes) return mockResponse(routes[path]);
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

/** Настраивает `GET /api/event-types/{id}/slots` на успешный ответ с сеткой. */
export function mockSlots(response: SlotsResponse): void {
  mockApi({ "/api/event-types/{id}/slots": response });
}
