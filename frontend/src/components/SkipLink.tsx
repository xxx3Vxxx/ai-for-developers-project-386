import { Anchor } from "@mantine/core";
import { useState, type CSSProperties } from "react";

import { common } from "../copy/common";

/**
 * Ссылка скрыта от глаз, пока не получит фокус (стандартный visually-hidden
 * набор свойств, ADR-0016). Своих `.css` и media queries не заводим.
 */
const HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/** Та же ссылка в фокусе — видимая плашка у верхнего левого угла. */
const VISIBLE: CSSProperties = {
  position: "fixed",
  top: "var(--mantine-spacing-xs)",
  left: "var(--mantine-spacing-xs)",
  zIndex: 400,
  width: "auto",
  height: "auto",
  padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
  overflow: "visible",
  clip: "auto",
  background: "var(--mantine-color-body)",
  border: "1px solid var(--mantine-color-gray-4)",
  borderRadius: "var(--mantine-radius-sm)",
};

/**
 * Skip-link «К содержимому» (ADR-0016): первая ссылка в Tab-порядке, ведёт к
 * `<main id="main-content">`. Скрыта, пока не получит фокус; показывается через
 * состояние, чтобы не заводить собственный CSS.
 */
export function SkipLink() {
  const [focused, setFocused] = useState(false);

  return (
    <Anchor
      href="#main-content"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={focused ? VISIBLE : HIDDEN}
    >
      {common.skipToContent}
    </Anchor>
  );
}
