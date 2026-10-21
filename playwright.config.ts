import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-сценарии браузерного пути гостя (ADR-0018). Тест поднимает
 * **прод-сборку** (бекенд отдаёт и API, и статику фронта, ADR-0014) на
 * изолированной БД `:memory:`, поэтому прогон воспроизводим и не трогает данные
 * разработчика. Перед запуском нужен `npm run build` (см. `npm run e2e`).
 */
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start --workspace backend",
    url: `${BASE_URL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      HOST: "127.0.0.1",
      DATABASE_PATH: ":memory:",
    },
  },
});
