import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Пиннит пайплайн контрактов (ADR-0008): артефакты не коммитятся, поэтому тест
 * проверяет результат генерации (`npm run contracts:generate`), а не источник.
 */
const specUrl = new URL("../tsp-output/@typespec/openapi3/openapi.yaml", import.meta.url);
const typesUrl = new URL("../generated/openapi.d.ts", import.meta.url);

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
});
