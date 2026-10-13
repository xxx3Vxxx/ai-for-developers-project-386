import { Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { Ref } from "react";

import type { Booking } from "../../api/bookings";
import { book } from "../../copy/book";
import { fullDateLabel, instantDate, instantTime } from "../../format/date";

interface SuccessScreenProps {
  /** Созданная бронь — детали экрана успеха. */
  booking: Booking;
  /** Длительность типа для строки деталей (из выбранного типа). */
  durationMinutes?: number;
  /** Зона сервиса из `GET /api/config` для сноски (ADR-0004). */
  timezone: string;
  /** Заголовок успеха получает фокус после создания брони (ADR-0016). */
  ref?: Ref<HTMLHeadingElement>;
}

/**
 * Экран успеха мастера: подтверждение записи с деталями брони и сноской о зоне
 * сервиса (ADR-0011, ADR-0015). Заменяет шаги мастера после `201`.
 */
export function SuccessScreen({ booking, durationMinutes, timezone, ref }: SuccessScreenProps) {
  const date = instantDate(booking.start);
  const start = instantTime(booking.start);
  const end = instantTime(booking.end);
  const title = durationMinutes
    ? `${booking.eventTypeTitle} · ${book.duration(durationMinutes)}`
    : booking.eventTypeTitle;

  return (
    <Paper withBorder radius="md" p="xl" role="status">
      <Stack gap="md">
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon color="green" variant="light" size="lg" radius="xl" aria-hidden>
            <Text fw={700}>✓</Text>
          </ThemeIcon>
          <div>
            <Title order={2} fz="h3" tabIndex={-1} ref={ref}>
              {book.success.title}
            </Title>
            <Text c="dimmed" size="sm">
              {book.success.description}
            </Text>
          </div>
        </Group>
        <Stack gap={4}>
          <Text fw={600}>{title}</Text>
          <Text>{`${fullDateLabel(date)}, ${start}–${end}`}</Text>
          <Text c="dimmed" size="sm">
            {`${booking.guestName} · ${booking.guestEmail}`}
          </Text>
        </Stack>
        {timezone ? (
          <Text c="dimmed" size="xs">
            {book.success.timezoneNote(timezone)}
          </Text>
        ) : null}
      </Stack>
    </Paper>
  );
}
