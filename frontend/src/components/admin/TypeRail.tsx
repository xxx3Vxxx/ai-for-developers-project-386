import { Badge, Group, Paper, Skeleton, Stack, Text, Title } from "@mantine/core";

import type { EventType } from "../../api/event-types";
import { admin } from "../../copy/admin";
import { common } from "../../copy/common";

interface TypeRailProps {
  /** Типы событий в порядке бекенда либо `null`, пока идёт чтение. */
  eventTypes: EventType[] | null;
}

/**
 * Узкий левый рельс «Типы событий» кабинета владельца (ADR-0012): только
 * просмотр — название и бейдж длительности. Создание типа живёт в выдвижной
 * панели (отдельный тикет), здесь его нет.
 */
export function TypeRail({ eventTypes }: TypeRailProps) {
  return (
    <Paper component="section" aria-label={admin.types.heading} withBorder radius="md" p="md">
      <Title order={2} fz="h4" mb="sm">
        {admin.types.heading}
      </Title>
      {eventTypes === null ? (
        <Stack gap="xs" role="status" aria-label={common.loading}>
          <Skeleton height={36} radius="sm" />
          <Skeleton height={36} radius="sm" />
        </Stack>
      ) : (
        <Stack gap="xs">
          {eventTypes.map((eventType) => (
            <Group key={eventType.id} justify="space-between" wrap="nowrap" gap="xs">
              <Text size="sm" fw={600} lineClamp={1}>
                {eventType.title}
              </Text>
              <Badge variant="default" radius="sm">
                {admin.duration(eventType.durationMinutes)}
              </Badge>
            </Group>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
