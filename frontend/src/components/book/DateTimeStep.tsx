import { Alert, Button, Loader, Stack, Text } from "@mantine/core";

import type { ConfigState } from "../../api/config";
import type { Slot, SlotsState } from "../../api/slots";
import { book } from "../../copy/book";
import { common } from "../../copy/common";
import { DateStrip } from "./DateStrip";
import { SlotsGrid } from "./SlotsGrid";

interface DateTimeStepProps {
  /** Состояние чтения параметров сервиса (зона, окно записи, сегодня). */
  configState: ConfigState;
  /** Повторное чтение параметров при ошибке. */
  onRetryConfig: () => void;
  /** Выбранная дата либо `null` (по умолчанию — сегодня). */
  selectedDate: string | null;
  /** Выбор даты. */
  onSelectDate: (date: string) => void;
  /** Начало выбранного слота либо `null`. */
  selectedStart: string | null;
  /** Выбор слота. */
  onSelectStart: (slot: Slot) => void;
  /** Состояние чтения сетки слотов. */
  slotsState: SlotsState;
  /** Повторное чтение сетки при ошибке. */
  onRetrySlots: () => void;
}

/**
 * Шаг 2 «Дата и время»: полоса 14 дней (ADR-0011), сетка слотов под длительность
 * выбранного типа и сноска о зоне сервиса (ADR-0016). Параметры сервиса приходят
 * из `GET /api/config`; состояния загрузки/ошибки — здесь же.
 */
export function DateTimeStep({
  configState,
  onRetryConfig,
  selectedDate,
  onSelectDate,
  selectedStart,
  onSelectStart,
  slotsState,
  onRetrySlots,
}: DateTimeStepProps) {
  if (configState.status === "loading") {
    return <Loader role="status" aria-label={common.loading} mt="md" />;
  }

  if (configState.status === "error") {
    return (
      <Alert role="alert" color="red" title={common.readError.title} mt="md">
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{common.readError.description}</Text>
          <Button variant="light" onClick={onRetryConfig}>
            {common.readError.retry}
          </Button>
        </Stack>
      </Alert>
    );
  }

  const config = configState.config;
  const date = selectedDate ?? config.today;

  return (
    <Stack gap="md">
      <DateStrip
        today={config.today}
        days={config.bookingWindowDays}
        selected={date}
        onSelect={onSelectDate}
      />
      <SlotsGrid
        state={slotsState}
        date={date}
        today={config.today}
        selectedStart={selectedStart}
        onSelect={onSelectStart}
        onRetry={onRetrySlots}
      />
      <Text size="sm" c="dimmed">
        {book.dateTimeStep.timezoneNote(config.timezone)}
      </Text>
    </Stack>
  );
}
