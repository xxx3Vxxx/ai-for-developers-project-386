// PROTOTYPE — throwaway entry point for the /book wizard exploration (issue #11).
// Sub-shape A: variants render on the existing /book route, gated by ?variant= and ?state=.
// Delete this whole folder (and restore BookingPage) once a variant is chosen.
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { VariantA } from "./VariantA";
import { VariantB } from "./VariantB";
import { VariantC } from "./VariantC";
import {
  PROTOTYPE_STATES,
  PrototypeSwitcher,
  VARIANT_KEYS,
  type PrototypeState,
  type VariantKey,
} from "./PrototypeSwitcher";

function isVariant(value: string): value is VariantKey {
  return (VARIANT_KEYS as readonly string[]).includes(value);
}

function isState(value: string): value is PrototypeState {
  return (PROTOTYPE_STATES as readonly string[]).includes(value);
}

export function BookingPrototype() {
  const [params, setParams] = useSearchParams();

  const rawVariant = (params.get("variant") ?? "A").toUpperCase();
  const variant: VariantKey = isVariant(rawVariant) ? rawVariant : "A";

  const rawState = params.get("state") ?? "normal";
  const state: PrototypeState = isState(rawState) ? rawState : "normal";

  const setVariant = useCallback(
    (next: VariantKey) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("variant", next);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setState = useCallback(
    (next: PrototypeState) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === "normal") p.delete("state");
          else p.set("state", next);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const cycleVariant = useCallback(
    (delta: number) => {
      const index = VARIANT_KEYS.indexOf(variant);
      setVariant(VARIANT_KEYS[(index + delta + VARIANT_KEYS.length) % VARIANT_KEYS.length]);
    },
    [variant, setVariant],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") cycleVariant(-1);
      if (event.key === "ArrowRight") cycleVariant(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycleVariant]);

  const props = { forcedState: state, onReset: () => setState("normal") };

  return (
    <>
      {variant === "A" && <VariantA {...props} />}
      {variant === "B" && <VariantB {...props} />}
      {variant === "C" && <VariantC {...props} />}

      {import.meta.env.DEV && (
        <PrototypeSwitcher
          variant={variant}
          state={state}
          onVariant={setVariant}
          onState={setState}
        />
      )}
    </>
  );
}
