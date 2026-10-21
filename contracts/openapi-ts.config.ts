import { defineConfig } from "@hey-api/openapi-ts";

/**
 * Генерация клиентского SDK из OpenAPI 3.0.0 (ADR-0008, ADR-0017).
 * Вход — спека, эмитированная TypeSpec; выход — типы и SDK в `generated/`.
 */
export default defineConfig({
  input: "tsp-output/@typespec/openapi3/openapi.yaml",
  output: {
    path: "generated",
    format: "prettier",
    // Явные `.js`-расширения: сгенерённый код потребляет и фронтенд (Bundler),
    // и бекенд (NodeNext, ADR-0008) — backend/tsconfig требует расширения.
    importFileExtension: ".js",
  },
  plugins: ["@hey-api/client-fetch"],
});
