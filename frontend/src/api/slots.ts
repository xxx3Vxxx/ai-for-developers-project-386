import type { Slot } from "contracts";
import { useCallback, useEffect, useState } from "react";

import { api } from "./client";

export type { Slot };

/** Состояние чтения сетки слотов дня. */
export type SlotsState =
  { status: "loading" } | { status: "ready"; slots: Slot[] } | { status: "error" };

/** Читает `GET /api/event-types/:id/slots?date=` сгенерированным SDK (ADR-0008). */
async function fetchSlots(eventTypeId: string, date: string): Promise<Slot[]> {
  const { data, error } = await api.listSlots({
    path: { id: eventTypeId },
    query: { date },
  });
  if (error) throw error;
  return data.slots;
}

/**
 * Сетка слотов выбранного типа и дня. Читает, когда заданы и тип, и дата;
 * смена любого из них (или `retry`) перечитывает сетку. Пустой день приходит как
 * полная сетка с `available: false` — решение о пустом состоянии принимает UI.
 */
export function useSlots(
  eventTypeId: string | null,
  date: string | null,
): { state: SlotsState; retry: () => void } {
  const [state, setState] = useState<SlotsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (eventTypeId === null || date === null) return;

    let active = true;
    setState({ status: "loading" });

    fetchSlots(eventTypeId, date).then(
      (slots) => {
        if (active) setState({ status: "ready", slots });
      },
      () => {
        if (active) setState({ status: "error" });
      },
    );

    return () => {
      active = false;
    };
  }, [eventTypeId, date, attempt]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
