import type { EventType, EventTypeRequest } from "contracts";
import { useCallback, useEffect, useState } from "react";

import { api } from "./client";

export type { EventType, EventTypeRequest };

/** Машинный код ошибки создания типа (ADR-0005, ADR-0010); незнакомые — как есть. */
export type EventTypeErrorCode = "VALIDATION_ERROR" | "SERVICE_UNAVAILABLE" | "INTERNAL_ERROR";

/** Разобранный конверт ошибки создания типа (ADR-0005, ADR-0015). */
export interface EventTypeError {
  code: EventTypeErrorCode | (string & {});
  message: string;
  fields?: Record<string, string>;
}

/** Результат создания типа: созданный тип либо ошибка для показа формой. */
export type CreateEventTypeResult =
  { ok: true; eventType: EventType } | { ok: false; error: EventTypeError };

/**
 * Создаёт тип события через `POST /api/event-types` (ADR-0010). Сетевой сбой
 * (запрос не дошёл) трактуется как недоступность сервиса — форма показывает то же
 * состояние, что для `503`/`500` (ADR-0015).
 */
export async function createEventType(body: EventTypeRequest): Promise<CreateEventTypeResult> {
  try {
    const { data, error } = await api.createEventType({ body });
    if (error) return { ok: false, error: error.error };
    if (!data) return { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "" } };
    return { ok: true, eventType: data };
  } catch {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "" } };
  }
}

/** Состояние чтения справочника типов событий. */
export type EventTypesState =
  { status: "loading" } | { status: "ready"; eventTypes: EventType[] } | { status: "error" };

/** Читает `GET /api/event-types` сгенерированным SDK (ADR-0008). */
async function fetchEventTypes(): Promise<EventType[]> {
  const { data, error } = await api.listEventTypes();
  if (error) throw error;
  return data;
}

/**
 * Справочник типов событий для мастера записи. Порядок задаёт бекенд
 * (`durationMinutes` asc, при равенстве `id` asc, ADR-0009); `retry` повторяет
 * чтение.
 */
export function useEventTypes(): { state: EventTypesState; retry: () => void } {
  const [state, setState] = useState<EventTypesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    fetchEventTypes().then(
      (eventTypes) => {
        if (active) setState({ status: "ready", eventTypes });
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
