import { Badge, Box, Group, Paper, Skeleton, Stack, Text, Title } from "@mantine/core";

import type { Booking } from "../../api/bookings";
import { admin } from "../../copy/admin";
import { common } from "../../copy/common";
import { instantDate, instantTime } from "../../format/date";

interface MeetingFeedProps {
  /** Предстоящие встречи в порядке `start` asc либо `null`, пока идёт чтение. */
  bookings: Booking[] | null;
  /** Сегодняшняя дата зоны сервиса (YYYY-MM-DD) либо `null`, пока идёт чтение. */
  today: string | null;
}

/** Встречи, сгруппированные по календарным суткам зоны сервиса (ADR-0012). */
interface DayGroup {
  date: string;
  items: Booking[];
}

/** Группирует встречи по суткам начала, сохраняя порядок `start` asc. */
function groupByDay(bookings: Booking[]): DayGroup[] {
  const groups = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const date = instantDate(booking.start);
    const list = groups.get(date);
    if (list) list.push(booking);
    else groups.set(date, [booking]);
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }));
}

/** Длительность встречи в минутах, выведенная из её интервала. */
function durationMinutes(booking: Booking): number {
  return Math.round((Date.parse(booking.end) - Date.parse(booking.start)) / 60_000);
}

/** Идёт ли встреча прямо сейчас: `start <= now < end` (ADR-0009, ADR-0012). */
function isOngoing(booking: Booking, now: number): boolean {
  return Date.parse(booking.start) <= now && Date.parse(booking.end) > now;
}

/**
 * Лента «Предстоящие встречи» кабинета владельца (ADR-0012): вертикальная лента,
 * сгруппированная по календарным суткам зоны сервиса, с заголовками
 * «Сегодня»/«Завтра»/дата, меткой «сегодня» и маркером «идёт сейчас». Элемент
 * показывает интервал, длительность, название типа, имя и email гостя. Пустое
 * состояние и загрузка — здесь же; ошибку чтения показывает страница.
 */
export function MeetingFeed({ bookings, today }: MeetingFeedProps) {
  const now = Date.now();

  let body;
  if (bookings === null || today === null) {
    body = <Skeleton height={220} radius="sm" role="status" aria-label={common.loading} />;
  } else if (bookings.length === 0) {
    body = (
      <Stack gap={4} role="status">
        <Text fw={600}>{admin.meetings.empty.title}</Text>
        <Text size="sm" c="dimmed">
          {admin.meetings.empty.description}
        </Text>
      </Stack>
    );
  } else {
    body = (
      <Stack gap="lg">
        {groupByDay(bookings).map((group) => (
          <Box key={group.date}>
            <Group gap="xs" align="baseline" mb="xs">
              <Text fw={700} size="sm">
                {admin.dayHeading(group.date, today)}
              </Text>
              {group.date === today ? (
                <Badge size="xs" color="grape" variant="light">
                  {admin.meetings.todayMark}
                </Badge>
              ) : null}
            </Group>
            <Box
              style={{
                borderLeft: "2px solid var(--mantine-color-gray-3)",
                paddingLeft: "var(--mantine-spacing-md)",
                marginLeft: 5,
              }}
            >
              <Stack gap="md">
                {group.items.map((booking) => {
                  const ongoing = isOngoing(booking, now);
                  return (
                    <Box key={booking.id} style={{ position: "relative" }}>
                      <Box
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: -22,
                          top: 6,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: ongoing
                            ? "var(--mantine-color-grape-6)"
                            : "var(--mantine-color-gray-5)",
                        }}
                      />
                      <Group gap="xs" align="baseline">
                        <Text fw={700} size="sm">
                          {instantTime(booking.start)}–{instantTime(booking.end)}
                        </Text>
                        <Badge size="xs" variant="light">
                          {admin.duration(durationMinutes(booking))}
                        </Badge>
                        {ongoing ? (
                          <Badge size="xs" color="grape" variant="filled">
                            {admin.meetings.ongoing}
                          </Badge>
                        ) : null}
                      </Group>
                      <Text size="sm" mt={2}>
                        {booking.eventTypeTitle}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {booking.guestName} · {booking.guestEmail}
                      </Text>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Box>
        ))}
      </Stack>
    );
  }

  return (
    <Paper component="section" aria-label={admin.meetings.heading} withBorder radius="md" p="lg">
      <Title order={2} fz="h4" mb="md">
        {admin.meetings.heading}
      </Title>
      {body}
    </Paper>
  );
}
