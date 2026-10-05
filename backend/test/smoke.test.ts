import { afterAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

describe("app", () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it("отвечает 200 на GET /health", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
