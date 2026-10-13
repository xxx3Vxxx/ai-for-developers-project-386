import { Alert, Badge, Button, Group, Loader, Radio, Stack, Text } from "@mantine/core";

import type { EventType, EventTypesState } from "../../api/event-types";
import { book } from "../../copy/book";
import { common } from "../../copy/common";

interface TypeStepProps {
  /** Состояние чтения справочника типов. */
  state: EventTypesState;
  /** id выбранного типа либо `null`. */
  selectedId: string | null;
  /** Выбор типа: определяет дальнейший сценарий мастера. */
  onSelect: (eventType: EventType) => void;
  /** Повторное чтение справочника при ошибке. */
  onRetry: () => void;
}

/**
 * Шаг 1 мастера «Тип»: список доступных типов событий с длительностью.
 * Выбор — радиогруппа (ADR-0016), состояние загрузки и ошибки чтения — здесь же.
 */
export function TypeStep({ state, selectedId, onSelect, onRetry }: TypeStepProps) {
  if (state.status === "loading") {
    return <Loader role="status" aria-label={common.loading} mt="md" />;
  }

  if (state.status === "error") {
    return (
      <Alert role="alert" color="red" title={common.readError.title} mt="md">
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{common.readError.description}</Text>
          <Button variant="light" onClick={onRetry}>
            {common.readError.retry}
          </Button>
        </Stack>
      </Alert>
    );
  }

  return (
    <Radio.Group
      aria-label={book.typeStep.groupLabel}
      value={selectedId ?? undefined}
      onChange={(value) => {
        const eventType = state.eventTypes.find((item) => item.id === value);
        if (eventType) onSelect(eventType);
      }}
      mt="md"
    >
      <Stack gap="sm">
        {state.eventTypes.map((eventType) => (
          <Radio.Card key={eventType.id} value={eventType.id} withBorder radius="md" p="md">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <Radio.Indicator />
                <div>
                  <Text fw={600}>{eventType.title}</Text>
                  <Text size="sm" c="dimmed">
                    {eventType.description}
                  </Text>
                </div>
              </Group>
              <Badge variant="light" radius="sm">
                {book.duration(eventType.durationMinutes)}
              </Badge>
            </Group>
          </Radio.Card>
        ))}
      </Stack>
    </Radio.Group>
  );
}
