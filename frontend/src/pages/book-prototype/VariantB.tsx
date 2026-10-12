// PROTOTYPE — throwaway. Variant B: single screen, master–detail.
// Month grid on the left (only the 14-day window is selectable), sticky summary on the right.
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useState } from "react";

import { ConflictBlock, EmptyBlock, ErrorBlock, LoadingBlock, SuccessBlock } from "./BookStates";
import {
  demoBooking,
  eventTypes,
  formatLong,
  formatMonthYear,
  isInWindow,
  monthGrid,
  shiftMonth,
  slotsFor,
  todayISO,
  weekdayHeaders,
  windowDates,
  type Booking,
  type EventType,
} from "./mock";
import type { PrototypeState } from "./PrototypeSwitcher";

export type VariantProps = {
  forcedState: PrototypeState;
  onReset: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pad = (n: number) => String(n).padStart(2, "0");

export function VariantB({ forcedState, onReset }: VariantProps) {
  const seedConflict = forcedState === "conflict";
  const [eventType, setEventType] = useState<EventType>(eventTypes[0]);
  const [date, setDate] = useState<string>(windowDates[0]);
  const [start, setStart] = useState<string | null>(seedConflict ? "14:00" : null);
  const [name, setName] = useState(seedConflict ? "Иван Петров" : "");
  const [email, setEmail] = useState(seedConflict ? "ivan@example.com" : "");
  const [view, setView] = useState(() => {
    const d = new Date(`${todayISO}T00:00:00Z`);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });
  const [conflict] = useState(seedConflict);
  const [booking, setBooking] = useState<Booking | null>(null);

  const slots = slotsFor(eventType, date);
  const hasAvailable = slots.some((slot) => slot.available);
  const showEmpty = forcedState === "empty" || !hasAvailable;
  const detailsValid = name.trim().length > 0 && EMAIL_RE.test(email.trim());

  const submit = () => {
    if (conflict || !start) return;
    setBooking(
      demoBooking({ eventType, date, start, guestName: name.trim(), guestEmail: email.trim() }),
    );
  };

  const monthValue = `${view.year}-${pad(view.month + 1)}-01`;

  return (
    <Container size="xl" py="xl" pb={96}>
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="lg">
            <div>
              <Title order={1} fz={28}>
                Запись на звонок
              </Title>
              <Text c="dimmed" mt={4}>
                Вариант B · один экран: месяц слева, ваша запись справа. Выбирать можно только дни
                окна записи.
              </Text>
            </div>

            <Group gap="xs">
              {eventTypes.map((et) => {
                const selected = eventType.id === et.id;
                return (
                  <UnstyledButton
                    key={et.id}
                    onClick={() => {
                      setEventType(et);
                      setStart(null);
                    }}
                  >
                    <Paper
                      withBorder
                      radius="xl"
                      px="md"
                      py="xs"
                      style={{
                        borderColor: selected ? "var(--mantine-color-blue-5)" : undefined,
                        borderWidth: selected ? 2 : 1,
                      }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={600} size="sm">
                          {et.title}
                        </Text>
                        <Badge size="sm" variant="light" radius="sm">
                          {et.durationMinutes} мин
                        </Badge>
                      </Group>
                    </Paper>
                  </UnstyledButton>
                );
              })}
            </Group>

            {forcedState === "loading" ? (
              <Paper withBorder radius="md" p="lg">
                <LoadingBlock rows={6} />
              </Paper>
            ) : forcedState === "error" ? (
              <ErrorBlock onRetry={onReset} />
            ) : (
              <>
                <Paper withBorder radius="md" p="md">
                  <Group justify="space-between" mb="sm">
                    <Text fw={600}>{formatMonthYear(monthValue)}</Text>
                    <Group gap={4}>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Предыдущий месяц"
                        onClick={() => setView(shiftMonth(view.year, view.month, -1))}
                      >
                        ‹
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Следующий месяц"
                        onClick={() => setView(shiftMonth(view.year, view.month, 1))}
                      >
                        ›
                      </ActionIcon>
                    </Group>
                  </Group>
                  <SimpleGrid cols={7} spacing={4}>
                    {weekdayHeaders.map((w) => (
                      <Text key={w} size="xs" c="dimmed" ta="center">
                        {w}
                      </Text>
                    ))}
                    {monthGrid(view.year, view.month).map((cell, i) =>
                      cell === null ? (
                        <div key={`blank-${i}`} />
                      ) : (
                        <DayCell
                          key={cell}
                          iso={cell}
                          selected={cell === date}
                          available={slotsFor(eventType, cell).some((slot) => slot.available)}
                          onSelect={(iso) => {
                            setDate(iso);
                            setStart(null);
                          }}
                        />
                      ),
                    )}
                  </SimpleGrid>
                </Paper>

                <div>
                  <Text fw={600} mb="xs">
                    Свободное время · {formatLong(date)}
                  </Text>
                  {showEmpty ? (
                    <EmptyBlock dateLabel={formatLong(date)} />
                  ) : (
                    <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
                      {slots.map((slot) => (
                        <Button
                          key={slot.start}
                          variant={start === slot.start ? "filled" : "default"}
                          disabled={!slot.available}
                          onClick={() => setStart(slot.start)}
                          styles={{
                            label: { textDecoration: slot.available ? undefined : "line-through" },
                          }}
                        >
                          {slot.start}
                        </Button>
                      ))}
                    </SimpleGrid>
                  )}
                </div>
              </>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Box style={{ position: "sticky", top: 16 }}>
            {booking || forcedState === "success" ? (
              <SuccessBlock booking={booking ?? demoBooking()} />
            ) : (
              <Card withBorder radius="md" p="lg">
                <Stack gap="md">
                  <Text fw={600}>Ваша запись</Text>

                  {start ? (
                    <Stack gap={4}>
                      <Text size="sm" fw={500}>
                        {eventType.title} · {eventType.durationMinutes} мин
                      </Text>
                      <Text size="sm">{formatLong(date)}</Text>
                      <Text size="sm">
                        {start}–{slotsFor(eventType, date).find((s) => s.start === start)?.end}
                      </Text>
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Выберите тип события, дату и время слева.
                    </Text>
                  )}

                  <Divider />

                  <TextInput
                    label="Имя"
                    placeholder="Как к вам обращаться"
                    required
                    value={name}
                    onChange={(event) => setName(event.currentTarget.value)}
                  />
                  <TextInput
                    label="Email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                  />

                  {conflict && <ConflictBlock onRetry={onReset} />}

                  <Button onClick={submit} disabled={conflict || !start || !detailsValid} fullWidth>
                    Записаться
                  </Button>
                  <Text size="xs" c="dimmed">
                    Время указано в зоне сервиса (Europe/Moscow).
                  </Text>
                </Stack>
              </Card>
            )}
          </Box>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

function DayCell({
  iso,
  selected,
  available,
  onSelect,
}: {
  iso: string;
  selected: boolean;
  available: boolean;
  onSelect: (iso: string) => void;
}) {
  const inWindow = isInWindow(iso);
  const day = Number(iso.slice(8, 10));
  return (
    <UnstyledButton disabled={!inWindow} onClick={() => inWindow && onSelect(iso)}>
      <Paper
        withBorder
        radius="sm"
        py={4}
        ta="center"
        style={{
          opacity: inWindow ? 1 : 0.3,
          borderColor: selected ? "var(--mantine-color-blue-5)" : undefined,
          background: selected ? "var(--mantine-color-blue-5)" : undefined,
        }}
      >
        <Text size="sm" fw={500} c={selected ? "white" : undefined}>
          {day}
        </Text>
        <Text size="10px" c={selected ? "white" : "green"} style={{ lineHeight: 1 }}>
          {inWindow && available ? "●" : " "}
        </Text>
      </Paper>
    </UnstyledButton>
  );
}
