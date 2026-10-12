// PROTOTYPE — throwaway. Floating switcher for the /admin exploration (issue #12).
// Two controls: variant (A/B/C) and forced screen state. Both live in the URL, so a
// view is shareable and reload-stable. Never ships: gated on import.meta.env.DEV.
import { Badge, Box, Button, Group, Paper, Text, UnstyledButton } from "@mantine/core";

import { PROTOTYPE_STATES, STATE_LABELS, type PrototypeState } from "./states";

export const VARIANT_KEYS = ["A", "B", "C"] as const;
export type VariantKey = (typeof VARIANT_KEYS)[number];

export const VARIANT_NAMES: Record<VariantKey, string> = {
  A: "Панель управления",
  B: "Секции в столбец",
  C: "Пульт с панелью",
};

export function isVariant(value: string): value is VariantKey {
  return (VARIANT_KEYS as readonly string[]).includes(value);
}

type Props = {
  variant: VariantKey;
  state: PrototypeState;
  onVariant: (next: VariantKey) => void;
  onState: (next: PrototypeState) => void;
};

export function PrototypeSwitcher({ variant, state, onVariant, onState }: Props) {
  const index = VARIANT_KEYS.indexOf(variant);

  const cycle = (delta: number) => {
    const next = VARIANT_KEYS[(index + delta + VARIANT_KEYS.length) % VARIANT_KEYS.length];
    onVariant(next);
  };

  return (
    <Box
      style={{
        position: "fixed",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        zIndex: 1000,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <Paper
        shadow="lg"
        radius="xl"
        px="sm"
        py="xs"
        withBorder
        style={{ background: "var(--mantine-color-dark-8)", color: "white" }}
      >
        <Group gap="sm" wrap="wrap" justify="center">
          <Group gap={4} wrap="nowrap">
            <UnstyledButton
              aria-label="Предыдущий вариант"
              onClick={() => cycle(-1)}
              style={{ color: "white", padding: "4px 8px", fontSize: 18 }}
            >
              ←
            </UnstyledButton>
            <Text fz="sm" fw={600} style={{ minWidth: 170, textAlign: "center" }}>
              {variant} · {VARIANT_NAMES[variant]}
            </Text>
            <UnstyledButton
              aria-label="Следующий вариант"
              onClick={() => cycle(1)}
              style={{ color: "white", padding: "4px 8px", fontSize: 18 }}
            >
              →
            </UnstyledButton>
          </Group>

          <Box w={1} h={24} style={{ background: "var(--mantine-color-dark-4)" }} />

          <Group gap={6} wrap="nowrap">
            <Text fz="xs" c="dimmed">
              состояние
            </Text>
            {PROTOTYPE_STATES.map((s) => (
              <Button
                key={s}
                size="compact-xs"
                radius="xl"
                variant={s === state ? "filled" : "subtle"}
                color={s === state ? "grape" : "gray"}
                onClick={() => onState(s)}
              >
                {STATE_LABELS[s]}
              </Button>
            ))}
          </Group>

          <Badge color="grape" variant="filled" radius="sm">
            prototype
          </Badge>
        </Group>
      </Paper>
    </Box>
  );
}
