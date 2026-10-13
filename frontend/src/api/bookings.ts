import type { components } from "contracts";

import { api } from "./client";

export type Booking = components["schemas"]["Booking"];
export type BookingRequest = components["schemas"]["BookingRequest"];

/** Машинный код ошибки записи (ADR-0005, ADR-0010); незнакомые коды — как есть. */
export type BookingErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_SLOT"
  | "DATE_OUT_OF_WINDOW"
  | "EVENT_TYPE_NOT_FOUND"
  | "CONFLICT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

/** Разобранный конверт ошибки `{ error: { code, message, fields? } }` (ADR-0005). */
export interface BookingError {
  code: BookingErrorCode | (string & {});
  message: string;
  fields?: Record<string, string>;
}

/** Результат записи: созданная бронь либо ошибка для показа на шаге (ADR-0015). */
export type BookingResult = { ok: true; booking: Booking } | { ok: false; error: BookingError };

/**
 * Создаёт бронь через `POST /api/bookings` (ADR-0010). Сетевой сбой (запрос не
 * дошёл) трактуется как недоступность сервиса — фронт показывает то же состояние,
 * что для `503`/`500` (ADR-0015).
 */
export async function createBooking(body: BookingRequest): Promise<BookingResult> {
  try {
    const { data, error } = await api.POST("/api/bookings", { body });
    if (error) return { ok: false, error: error.error };
    if (!data) return { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "" } };
    return { ok: true, booking: data };
  } catch {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "" } };
  }
}
