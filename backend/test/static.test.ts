import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { createDb } from "../src/db.js";
import { errorMessages } from "../src/messages.js";

const INDEX_HTML = '<!doctype html><div id="root">calendar</div>';
const ASSET = "console.log('app');";

/** Проверяет единый конверт `404 NOT_FOUND` (ADR-0005, ADR-0009). */
function expectNotFound(response: { statusCode: number; json: () => unknown }): void {
  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({
    error: { code: "NOT_FOUND", message: errorMessages.NOT_FOUND },
  });
}

describe("статика и SPA-fallback (ADR-0014)", () => {
  let root: string;
  let app: ReturnType<typeof buildApp>;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "calendar-static-"));
    writeFileSync(join(root, "index.html"), INDEX_HTML);
    mkdirSync(join(root, "assets"));
    writeFileSync(join(root, "assets", "app-abc123.js"), ASSET);

    app = buildApp({ db: createDb(":memory:"), staticRoot: root });
  });

  afterAll(async () => {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("GET / с Accept: text/html отдаёт index.html без кэша", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/",
      headers: { accept: "text/html" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("calendar");
    expect(response.headers["cache-control"]).toBe("no-cache");
  });

  it("GET глубокого маршрута с Accept: text/html отдаёт index.html (SPA-fallback)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/admin",
      headers: { accept: "text/html,application/xhtml+xml" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("calendar");
    expect(response.headers["cache-control"]).toBe("no-cache");
  });

  it("GET /assets/* отдаёт хешированный ассет как immutable", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/assets/app-abc123.js",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("console.log");
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("GET вне /api без Accept: text/html → 404 NOT_FOUND", async () => {
    const response = await app.inject({ method: "GET", url: "/admin" });

    expectNotFound(response);
  });

  it("GET /api/* с Accept: text/html не уходит в SPA-fallback", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/unknown",
      headers: { accept: "text/html" },
    });

    expectNotFound(response);
  });

  it("GET /apiary (не /api) с Accept: text/html уходит в SPA-fallback", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/apiary",
      headers: { accept: "text/html" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("calendar");
  });

  it("GET /health не перехватывается статикой", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("маршрут API не перехватывается wildcard статики", async () => {
    const response = await app.inject({ method: "GET", url: "/api/config" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ timezone: "Europe/Moscow" });
  });
});
