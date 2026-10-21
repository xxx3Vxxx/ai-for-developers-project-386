import {
  createBooking,
  createEventType,
  getConfig,
  listBookings,
  listEventTypes,
  listSlots,
} from "contracts";
import { client } from "contracts/client";

/**
 * Клиентский SDK, сгенерированный из OpenAPI (`@hey-api/openapi-ts`, ADR-0008)
 * и настроенный на текущий origin: пути в спеке уже включают префикс `/api`,
 * поэтому запросы идут относительно origin, а не на адрес из спеки.
 */
client.setConfig({ baseUrl: "" });

/**
 * Единая точка доступа фронтенда к API. Здесь собираются сгенерированные
 * операции SDK; компоненты и хуки не создают клиент руками.
 */
export const api = {
  getConfig,
  listEventTypes,
  listSlots,
  listBookings,
  createEventType,
  createBooking,
};
