import type { Booking, BookingRequest } from "contracts";
import { useCallback, useEffect, useState } from "react";

import { api } from "./client";

export type { Booking, BookingRequest };

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
    const { data, error } = await api.createBooking({ body });
    if (error) return { ok: false, error: error.error };
    if (!data) return { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "" } };
    return { ok: true, booking: data };
  } catch {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "" } };
  }
}

/** Состояние чтения предстоящих встреч владельца. */
export type BookingsState =
  { status: "loading" } | { status: "ready"; bookings: Booking[] } | { status: "error" };

/** Читает `GET /api/bookings` сгенерированным SDK (ADR-0008). */
async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await api.listBookings();
  if (error) throw error;
  return data;
}

/**
 * Предстоящие встречи для ленты `/admin` (ADR-0009, ADR-0012): «предстоящая» —
 * `end > now`, порядок `start` asc. `retry` повторяет чтение.
 */
export function useBookings(): { state: BookingsState; retry: () => void } {
  const [state, setState] = useState<BookingsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    fetchBookings().then(
      (bookings) => {
        if (active) setState({ status: "ready", bookings });
      },
      () => {
        if (active) setState({ status: "error" });
      },
    );

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
