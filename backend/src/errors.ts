import type { FastifyError, FastifyInstance, FastifyReply } from "fastify";

import { errorMessages, type ErrorCode } from "./messages.js";

/** HTTP-статус по машинному коду (ADR-0005, ADR-0009, ADR-0010). */
export const errorStatus: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_SLOT: 400,
  DATE_OUT_OF_WINDOW: 400,
  EVENT_TYPE_NOT_FOUND: 404,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/** По-полевые сообщения валидации: «поле → сообщение». */
export type ErrorFields = Record<string, string>;

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    fields?: ErrorFields;
  };
}

/** Доменная ошибка: роут бросает её вместо ручной сборки конверта. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly fields?: ErrorFields;

  constructor(code: ErrorCode, fields?: ErrorFields) {
    super(errorMessages[code]);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
  }
}

/** Собирает конверт ошибки; `fields` попадает в тело только когда задан. */
export function envelope(code: ErrorCode, fields?: ErrorFields): ErrorEnvelope {
  const detail = { code, message: errorMessages[code] };
  return fields === undefined ? { error: detail } : { error: { ...detail, fields } };
}

/** Отправляет клиентскую ошибку в едином конверте с кодом и статусом (ADR-0005). */
export function sendError(reply: FastifyReply, code: ErrorCode, fields?: ErrorFields): void {
  reply.status(errorStatus[code]).send(envelope(code, fields));
}

/**
 * Единый конверт для всех ошибок (ADR-0005): доменная ошибка — по своему коду,
 * прочие клиентские ошибки Fastify (например, битый JSON) — `400
 * VALIDATION_ERROR`, внутренняя — `500 INTERNAL_ERROR` без деталей. Неизвестный
 * маршрут (`404 NOT_FOUND`) размечает обработчик из `static.ts`, который совмещает
 * его со SPA-fallback (ADR-0014).
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ApiError) {
      sendError(reply, error.code, error.fields);
      return;
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 400 && statusCode < 500) {
      sendError(reply, "VALIDATION_ERROR");
      return;
    }

    request.log.error(error);
    sendError(reply, "INTERNAL_ERROR");
  });
}
