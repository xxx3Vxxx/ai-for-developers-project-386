import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb } from "../src/db.js";
import { ApiError, sendError } from "../src/errors.js";
import { errorMessages } from "../src/messages.js";

function buildTestApp() {
  return buildApp({ config: loadConfig({}), db: createDb(":memory:") });
}

describe("единый конверт ошибок (ADR-0005)", () => {
  it("неизвестный маршрут → 404 NOT_FOUND", async () => {
    const app = buildTestApp();
    try {
      const response = await app.inject({ method: "GET", url: "/api/unknown" });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "NOT_FOUND", message: errorMessages.NOT_FOUND },
      });
    } finally {
      await app.close();
    }
  });

  it("доменная ошибка отдаётся конвертом со статусом по коду", async () => {
    const app = buildTestApp();
    app.get("/api/conflict", async (_request, reply) => {
      sendError(reply, "CONFLICT");
    });
    try {
      const response = await app.inject({ method: "GET", url: "/api/conflict" });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: { code: "CONFLICT", message: errorMessages.CONFLICT },
      });
    } finally {
      await app.close();
    }
  });

  it("валидационная ошибка несёт fields «поле → сообщение»", async () => {
    const app = buildTestApp();
    app.post("/api/validate", async (_request, reply) => {
      sendError(reply, "VALIDATION_ERROR", { guestName: "Укажите имя" });
    });
    try {
      const response = await app.inject({ method: "POST", url: "/api/validate" });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: errorMessages.VALIDATION_ERROR,
          fields: { guestName: "Укажите имя" },
        },
      });
    } finally {
      await app.close();
    }
  });

  it("брошенный ApiError превращается в тот же конверт", async () => {
    const app = buildTestApp();
    app.get("/api/throws", async () => {
      throw new ApiError("EVENT_TYPE_NOT_FOUND");
    });
    try {
      const response = await app.inject({ method: "GET", url: "/api/throws" });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "EVENT_TYPE_NOT_FOUND", message: errorMessages.EVENT_TYPE_NOT_FOUND },
      });
    } finally {
      await app.close();
    }
  });

  it("битый JSON — тоже клиентская ошибка в конверте", async () => {
    const app = buildTestApp();
    app.post("/api/parse", async () => ({ ok: true }));
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/parse",
        headers: { "content-type": "application/json" },
        payload: "{ не json",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: { code: "VALIDATION_ERROR", message: errorMessages.VALIDATION_ERROR },
      });
    } finally {
      await app.close();
    }
  });

  it("внутренняя ошибка → 500 INTERNAL_ERROR без деталей", async () => {
    const app = buildTestApp();
    app.get("/api/boom", async () => {
      throw new Error("секретная деталь реализации");
    });
    try {
      const response = await app.inject({ method: "GET", url: "/api/boom" });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: { code: "INTERNAL_ERROR", message: errorMessages.INTERNAL_ERROR },
      });
      expect(response.body).not.toContain("секретная деталь");
    } finally {
      await app.close();
    }
  });
});
