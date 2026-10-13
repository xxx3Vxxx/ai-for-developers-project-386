import { Alert, Button, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";

import type { Slot, SlotsState } from "../../api/slots";
import { book } from "../../copy/book";
import { common } from "../../copy/common";
import { dateLabel } from "../../format/date";

interface SlotsGridProps {
  /** Состояние чтения сетки. */
  state: SlotsState;
  /** Дата сетки (YYYY-MM-DD). */
  date: string;
  /** Сегодняшняя дата зоны сервиса (YYYY-MM-DD). */
  today: string;
  /** Начало выбранного слота либо `null`. */
  selectedStart: string | null;
  /** Выбор слота. */
  onSelect: (slot: Slot) => void;
  /** Повторное чтение сетки при ошибке. */
  onRetry: () => void;
}

const SKELETON_COUNT = 12;

/**
 * Сетка слотов дня: кнопки `HH:MM`, занятые и уже начавшиеся — `disabled` и
 * зачёркнуты (ADR-0011, ADR-0016). Состояния загрузки, пустого дня и ошибки
 * чтения живут здесь же.
 */
export function SlotsGrid({
  state,
  date,
  today,
  selectedStart,
  onSelect,
  onRetry,
}: SlotsGridProps) {
  if (state.status === "loading") {
    return (
      <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs" role="status" aria-label={common.loading}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <Skeleton key={index} height={36} radius="sm" />
        ))}
      </SimpleGrid>
    );
  }

  if (state.status === "error") {
    return (
      <Alert role="alert" color="red" title={book.dateTimeStep.readError.title}>
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{book.dateTimeStep.readError.description}</Text>
          <Button variant="light" onClick={onRetry}>
            {book.dateTimeStep.readError.retry}
          </Button>
        </Stack>
      </Alert>
    );
  }

  const hasAvailable = state.slots.some((slot) => slot.available);
  if (!hasAvailable) {
    return (
      <Stack gap={4} role="status">
        <Text fw={600}>{book.dateTimeStep.emptyTitle}</Text>
        <Text size="sm" c="dimmed">
          {date === today
            ? book.dateTimeStep.emptyForToday
            : book.dateTimeStep.emptyForDate(dateLabel(date))}
        </Text>
      </Stack>
    );
  }

  return (
    <SimpleGrid
      cols={{ base: 3, sm: 4 }}
      spacing="xs"
      role="group"
      aria-label={book.dateTimeStep.slotsGroupLabel(dateLabel(date))}
    >
      {state.slots.map((slot) => {
        const isSelected = slot.start === selectedStart;
        return (
          <Button
            key={slot.start}
            variant={isSelected ? "filled" : "default"}
            disabled={!slot.available}
            aria-pressed={isSelected}
            onClick={() => onSelect(slot)}
            style={slot.available ? undefined : { textDecoration: "line-through" }}
          >
            {slot.start.slice(11, 16)}
          </Button>
        );
      })}
    </SimpleGrid>
  );
}
