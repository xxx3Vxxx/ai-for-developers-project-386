import type { components } from "contracts";
import { useCallback, useEffect, useState } from "react";

import { api } from "./client";

export type EventType = components["schemas"]["EventType"];

/** Состояние чтения справочника типов событий. */
export type EventTypesState =
  { status: "loading" } | { status: "ready"; eventTypes: EventType[] } | { status: "error" };

/** Читает `GET /api/event-types` сгенерированным клиентом (ADR-0008). */
async function fetchEventTypes(): Promise<EventType[]> {
  const { data, error } = await api.GET("/api/event-types");
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
