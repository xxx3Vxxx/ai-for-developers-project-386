import type { Booking, EventType, ServiceConfig, SlotsResponse } from "contracts/types";
import { vi } from "vitest";

/**
 * Мок сгенерированного SDK (`@hey-api/openapi-ts`, ADR-0008) для компонентных
 * тестов. Тест подменяет модуль `src/api/client` этим моком:
 *
 * ```ts
 * vi.mock("../src/api/client", () => import("./helpers/api"));
 * ```
 *
 * Ответы настраиваются по имени операции (`mockConfig`, `mockEventTypes`,
 * `mockSlots`, `mockBookings`) либо напрямую через `api.<operation>`, а между
 * тестами состояние сбрасывается `resetApiMock()`. Незамоканная операция
 * отклоняется — тест не молчит о забытом запросе.
 */
export const api = {
  getConfig: vi.fn(),
  listEventTypes: vi.fn(),
  listSlots: vi.fn(),
  listBookings: vi.fn(),
  createEventType: vi.fn(),
  createBooking: vi.fn(),
};

/** Сбрасывает вызовы и настройки мока SDK; вызывать в `beforeEach`. */
export function resetApiMock(): void {
  for (const operation of Object.values(api)) {
    operation.mockReset();
    operation.mockRejectedValue(new Error("Незамоканная операция SDK"));
  }
}

/** Успешный ответ в форме, которую возвращает сгенерированный SDK. */
export function mockResponse<T>(data: T) {
  return { data, response: new Response(null, { status: 200 }) };
}

/**
 * Ошибочный ответ в форме сгенерированного SDK: `error` — разобранный конверт
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

/** Чтения API по путям (соответствуют сгенерированным операциям). */
export interface ApiRoutes {
  "/api/config"?: ServiceConfig;
  "/api/event-types"?: EventType[];
  "/api/event-types/{id}/slots"?: SlotsResponse;
  "/api/bookings"?: Booking[];
}

/** Настраивает несколько чтений одной настройкой; незаданные пути не трогает. */
export function mockApi(routes: ApiRoutes): void {
  if (routes["/api/config"] !== undefined) {
    api.getConfig.mockResolvedValue(mockResponse(routes["/api/config"]));
  }
  if (routes["/api/event-types"] !== undefined) {
    api.listEventTypes.mockResolvedValue(mockResponse(routes["/api/event-types"]));
  }
  if (routes["/api/event-types/{id}/slots"] !== undefined) {
    api.listSlots.mockResolvedValue(mockResponse(routes["/api/event-types/{id}/slots"]));
  }
  if (routes["/api/bookings"] !== undefined) {
    api.listBookings.mockResolvedValue(mockResponse(routes["/api/bookings"]));
  }
}

/** Настраивает `GET /api/config` на успешный ответ с заданной конфигурацией. */
export function mockConfig(config: ServiceConfig): void {
  api.getConfig.mockResolvedValue(mockResponse(config));
}

/** Настраивает `GET /api/event-types` на успешный ответ со списком типов. */
export function mockEventTypes(eventTypes: EventType[]): void {
  api.listEventTypes.mockResolvedValue(mockResponse(eventTypes));
}

/** Настраивает `GET /api/event-types/{id}/slots` на успешный ответ с сеткой. */
export function mockSlots(response: SlotsResponse): void {
  api.listSlots.mockResolvedValue(mockResponse(response));
}
