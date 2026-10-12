// PROTOTYPE — throwaway. In-memory store for the /admin exploration (issue #12).
// No persistence and no network: creating a type only mutates local state.
// Delete this whole folder once a variant is chosen.
import { useCallback, useMemo, useState } from "react";

import {
  createdDemo,
  initialBookings,
  initialEventTypes,
  validateEventTypeDraft,
  type Booking,
  type CreateResult,
  type EventType,
  type EventTypeDraft,
} from "./mock";
import type { PrototypeState } from "./states";

export type AdminPhase = "loading" | "ready" | "error";

export type AdminStore = {
  phase: AdminPhase;
  eventTypes: EventType[];
  bookings: Booking[];
  lastCreated: EventType | null;
  createEventType: (draft: EventTypeDraft) => CreateResult;
  dismissCreated: () => void;
};

export function useAdminStore(forcedState: PrototypeState): AdminStore {
  const [eventTypes, setEventTypes] = useState<EventType[]>(initialEventTypes);
  const [lastCreated, setLastCreated] = useState<EventType | null>(null);

  const phase: AdminPhase =
    forcedState === "loading" ? "loading" : forcedState === "error" ? "error" : "ready";

  // ?state=success pretends a type was just created, so the screen is reproducible.
  const eventTypesForView = useMemo(() => {
    if (forcedState !== "success") return eventTypes;
    return [...eventTypes.filter((type) => type.id !== createdDemo.id), createdDemo];
  }, [eventTypes, forcedState]);

  const bookings = useMemo(() => (forcedState === "empty" ? [] : initialBookings), [forcedState]);

  const createEventType = useCallback((draft: EventTypeDraft): CreateResult => {
    const fields = validateEventTypeDraft(draft);
    if (Object.keys(fields).length > 0) return { ok: false, fields };

    const eventType: EventType = {
      id: `et-new-${Math.random().toString(36).slice(2, 8)}`,
      title: draft.title.trim(),
      description: draft.description.trim(),
      durationMinutes: draft.durationMinutes,
    };
    setEventTypes((prev) => [...prev, eventType]);
    setLastCreated(eventType);
    return { ok: true, eventType };
  }, []);

  const dismissCreated = useCallback(() => setLastCreated(null), []);

  return {
    phase,
    eventTypes: eventTypesForView,
    bookings,
    lastCreated: forcedState === "success" ? createdDemo : lastCreated,
    createEventType,
    dismissCreated,
  };
}
