import { Box, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { useRef, useState } from "react";

import { book } from "../../copy/book";
import { dateRange, dayNumber, fullDateLabel, weekdayShort } from "../../format/date";

interface DateStripProps {
  /** Сегодняшняя дата зоны сервиса (YYYY-MM-DD). */
  today: string;
  /** Длина окна записи в сутках. */
  days: number;
  /** Выбранная дата (YYYY-MM-DD). */
  selected: string;
  /** Выбор даты. */
  onSelect: (date: string) => void;
}

/** Всегда 7 колонок — две строки по 7 дней (ADR-0016). */
const COLUMNS = 7;

/**
 * Полоса дат окна записи: одиночный выбор с семантикой `radiogroup` и roving
 * tabindex, стрелки ←→↑↓ по 2D-раскладке, выбор — Enter/Space или клик
 * (ADR-0011, ADR-0016). Дни вне окна не рендерятся.
 */
export function DateStrip({ today, days, selected, onSelect }: DateStripProps) {
  const dates = dateRange(today, days);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  // Roving tabindex: ровно один день в Tab-порядке — тот, что в фокусе (ADR-0016).
  const [focusedIndex, setFocusedIndex] = useState(() => Math.max(0, dates.indexOf(selected)));

  function focusIndex(index: number): void {
    const clamped = Math.max(0, Math.min(dates.length - 1, index));
    setFocusedIndex(clamped);
    buttons.current[clamped]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={book.dateTimeStep.dateGroupLabel(days)}>
      <SimpleGrid cols={COLUMNS} spacing="xs">
        {dates.map((date, index) => {
          const isSelected = date === selected;
          const isToday = date === today;
          const label = isToday
            ? `${fullDateLabel(date)}, ${book.dateTimeStep.todayMark.toLowerCase()}`
            : fullDateLabel(date);

          return (
            <UnstyledButton
              key={date}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              role="radio"
              aria-checked={isSelected}
              aria-current={isSelected ? "date" : undefined}
              aria-label={label}
              tabIndex={index === focusedIndex ? 0 : -1}
              onClick={() => {
                setFocusedIndex(index);
                onSelect(date);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  focusIndex(index + 1);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  focusIndex(index - 1);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusIndex(index + COLUMNS);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  focusIndex(index - COLUMNS);
                }
              }}
              style={{
                padding: "var(--mantine-spacing-xs)",
                border: `1px solid ${isSelected ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-3)"}`,
                borderRadius: "var(--mantine-radius-sm)",
                background: isSelected ? "var(--mantine-color-blue-0)" : undefined,
              }}
            >
              <Stack gap={2} align="center">
                <Text size="xs" c="dimmed">
                  {weekdayShort(date)}
                </Text>
                <Text fw={600}>{dayNumber(date)}</Text>
                {isToday ? <Box w={4} h={4} bg="blue" style={{ borderRadius: "50%" }} /> : null}
              </Stack>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </div>
  );
}
