import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Пиннит пайплайн контрактов (ADR-0008): артефакты не коммитятся, поэтому тест
 * проверяет результат генерации (`npm run contracts:generate`), а не источник:
 * TypeSpec → OpenAPI 3.0.0 → типы и клиентский SDK (`@hey-api/openapi-ts`).
 */
const specUrl = new URL("../tsp-output/@typespec/openapi3/openapi.yaml", import.meta.url);
const typesUrl = new URL("../generated/types.gen.ts", import.meta.url);
const sdkUrl = new URL("../generated/sdk.gen.ts", import.meta.url);

function readArtifact(url: URL): string {
  const path = fileURLToPath(url);
  expect(existsSync(path), `Артефакт не сгенерирован: ${path}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("пайплайн контрактов", () => {
  it("эмитит OpenAPI 3.0.0", () => {
    expect(readArtifact(specUrl)).toMatch(/^openapi: 3\.0\.0$/m);
  });

  it("описывает GET /api/config", () => {
    expect(readArtifact(specUrl)).toMatch(/^\s*\/api\/config:/m);
  });

  it("генерирует типы с путём /api/config", () => {
    expect(readArtifact(typesUrl)).toContain('"/api/config"');
  });

  it("описывает GET /api/event-types и схему EventType", () => {
    const spec = readArtifact(specUrl);

    expect(spec).toMatch(/^\s*\/api\/event-types:/m);
    expect(spec).toMatch(/^\s*EventType:/m);
  });

  it("генерирует типы с путём /api/event-types", () => {
    const types = readArtifact(typesUrl);

    expect(types).toContain('"/api/event-types"');
    expect(types).toMatch(/export type EventType = \{/);
  });

  it("описывает GET /api/event-types/{id}/slots и схему SlotsResponse", () => {
    const spec = readArtifact(specUrl);

    expect(spec).toMatch(/^\s*\/api\/event-types\/\{id\}\/slots:/m);
    expect(spec).toMatch(/^\s*SlotsResponse:/m);
    expect(spec).toMatch(/^\s*Slot:/m);
  });

  it("генерирует типы с путём /api/event-types/{id}/slots", () => {
    expect(readArtifact(typesUrl)).toContain('"/api/event-types/{id}/slots"');
  });

  it("описывает POST /api/bookings и схемы Booking и BookingRequest", () => {
    const spec = readArtifact(specUrl);

    expect(spec).toMatch(/^\s*\/api\/bookings:/m);
    expect(spec).toMatch(/^\s*'201':$/m);
    expect(spec).toMatch(/^\s*Booking:/m);
    expect(spec).toMatch(/^\s*BookingRequest:/m);
  });

  it("генерирует типы с путём /api/bookings", () => {
    expect(readArtifact(typesUrl)).toContain('"/api/bookings"');
  });

  it("генерирует клиентский SDK со всеми операциями", () => {
    const sdk = readArtifact(sdkUrl);

    for (const operation of [
      "getConfig",
      "listEventTypes",
      "listSlots",
      "listBookings",
      "createEventType",
      "createBooking",
    ]) {
      expect(sdk).toContain(`export const ${operation} =`);
    }
    expect(sdk).toContain('"/api/bookings"');
  });
});
