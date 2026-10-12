import createClient from "openapi-fetch";

import type { paths } from "contracts";

/**
 * Типизированный клиент к HTTP API (ADR-0008). Пути в спеке уже включают
 * префикс `/api`, поэтому `baseUrl` не задаётся — запросы идут относительно origin.
 */
export const api = createClient<paths>();
