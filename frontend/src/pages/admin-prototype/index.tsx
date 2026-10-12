// PROTOTYPE — throwaway. Entry point for the /admin exploration (issue #12).
// Sub-shape B: /admin has no page yet, so the variants live on a throwaway route
// /prototype/admin, gated by ?variant= and ?state=.
// Delete this whole folder (and the route in App.tsx) once a variant is chosen.
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { isPrototypeState, type PrototypeState } from "./states";
import { PrototypeSwitcher, VARIANT_KEYS, isVariant, type VariantKey } from "./PrototypeSwitcher";
import { VariantA } from "./VariantA";
import { VariantB } from "./VariantB";
import { VariantC } from "./VariantC";

export function AdminPrototype() {
  const [params, setParams] = useSearchParams();

  const rawVariant = (params.get("variant") ?? "A").toUpperCase();
  const variant: VariantKey = isVariant(rawVariant) ? rawVariant : "A";

  const rawState = params.get("state") ?? "normal";
  const state: PrototypeState = isPrototypeState(rawState) ? rawState : "normal";

  const setVariant = useCallback(
    (next: VariantKey) => {
      setParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          nextParams.set("variant", next);
          return nextParams;
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
          const nextParams = new URLSearchParams(prev);
          if (next === "normal") nextParams.delete("state");
          else nextParams.set("state", next);
          return nextParams;
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
