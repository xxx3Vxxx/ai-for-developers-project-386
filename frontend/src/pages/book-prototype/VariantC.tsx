// PROTOTYPE — throwaway. Variant C: 14-day agenda rail + modal.
// No month calendar at all: a horizontal rail of the 14 booking-window days, each a column
// of time chips. Picking a chip opens a modal for the guest details.
import {
  Badge,
  Button,
  Container,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SegmentedControl,
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
  formatDayShort,
  formatLong,
  formatWeekday,
  slotsFor,
  todayISO,
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

export function VariantC({ forcedState, onReset }: VariantProps) {
  const seedConflict = forcedState === "conflict";
  const [eventType, setEventType] = useState<EventType>(eventTypes[1]);
  const [date, setDate] = useState<string | null>(seedConflict ? windowDates[3] : null);
  const [start, setStart] = useState<string | null>(seedConflict ? "14:00" : null);
  const [name, setName] = useState(seedConflict ? "Иван Петров" : "");
  const [email, setEmail] = useState(seedConflict ? "ivan@example.com" : "");
  const [conflict, setConflict] = useState(seedConflict);
  const [modalOpen, setModalOpen] = useState(seedConflict);
  const [booking, setBooking] = useState<Booking | null>(null);

  const openModal = (nextDate: string, nextStart: string) => {
    setDate(nextDate);
    setStart(nextStart);
    setConflict(false);
    setModalOpen(true);
  };

  const submit = () => {
    if (!date || !start || conflict) return;
    setBooking(
      demoBooking({ eventType, date, start, guestName: name.trim(), guestEmail: email.trim() }),
    );
    setModalOpen(false);
  };

  const detailsValid = name.trim().length > 0 && EMAIL_RE.test(email.trim());

  const body = (() => {
    if (forcedState === "loading") return <LoadingBlock rows={8} />;
    if (forcedState === "error") return <ErrorBlock onRetry={onReset} />;
    if (forcedState === "empty") return <EmptyBlock />;
    return (
      <ScrollArea type="auto" offsetScrollbars>
        <Group gap="sm" wrap="nowrap" align="flex-start" pb="sm">
          {windowDates.map((d) => (
            <DayColumn
              key={d}
              date={d}
              eventType={eventType}
              selected={date === d ? start : null}
              onPick={openModal}
            />
          ))}
        </Group>
      </ScrollArea>
    );
  })();

  return (
    <Container size="lg" py="xl" pb={96}>
      <Stack gap="lg">
        <div>
          <Title order={1} fz={28}>
            Запись на звонок
          </Title>
          <Text c="dimmed" mt={4}>
            Вариант C · агенда на 14 дней: горизонтальная лента дней, слот — чип, данные гостя — в
            окне.
          </Text>
        </div>

        <Group justify="space-between" wrap="wrap">
          <SegmentedControl
            value={eventType.id}
            onChange={(value) => {
              const next = eventTypes.find((et) => et.id === value);
              if (next) setEventType(next);
            }}
            data={eventTypes.map((et) => ({ label: `${et.title} · ${et.durationMinutes} мин`, value: et.id }))}
          />
          <Text size="xs" c="dimmed">
            Окно записи: {formatDayShort(windowDates[0])} — {formatDayShort(windowDates[windowDates.length - 1])}
          </Text>
        </Group>

        {booking || forcedState === "success" ? <SuccessBlock booking={booking ?? demoBooking()} /> : body}
      </Stack>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Подтверждение записи"
        centered
      >
        <Stack gap="md">
          <Stack gap={4}>
            <Text fw={600}>
              {eventType.title} · {eventType.durationMinutes} мин
            </Text>
            <Text size="sm">{date ? formatLong(date) : "—"}</Text>
            <Text size="sm">
              {start ?? "—"}
              {date && start
                ? `–${slotsFor(eventType, date).find((s) => s.start === start)?.end ?? ""}`
                : ""}
            </Text>
          </Stack>

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

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={conflict || !detailsValid}>
              Записаться
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            Время указано в зоне сервиса (Europe/Moscow).
          </Text>
        </Stack>
      </Modal>
    </Container>
  );
}

function DayColumn({
  date,
  eventType,
  selected,
  onPick,
}: {
  date: string;
  eventType: EventType;
  selected: string | null;
  onPick: (date: string, start: string) => void;
}) {
  const slots = slotsFor(eventType, date);
  const availableCount = slots.filter((slot) => slot.available).length;

  return (
    <Paper withBorder radius="md" p="xs" style={{ width: 136, flex: "0 0 auto" }}>
      <Stack gap={6}>
        <div style={{ textAlign: "center" }}>
          <Text size="xs" c="dimmed">
            {formatWeekday(date)}
          </Text>
          <Text fw={600} size="sm">
            {formatDayShort(date)}
          </Text>
          {date === todayISO ? (
            <Badge size="xs" variant="light" color="blue">
              сегодня
            </Badge>
          ) : (
            <Text size="10px" c="dimmed">
              {availableCount} свободно
            </Text>
          )}
        </div>

        <ScrollArea h={300} type="auto" offsetScrollbars>
          <SimpleGrid cols={2} spacing={4}>
            {slots.map((slot) => {
              const isSelected = selected === slot.start;
              return (
                <UnstyledButton
                  key={slot.start}
                  disabled={!slot.available}
                  onClick={() => slot.available && onPick(date, slot.start)}
                >
                  <Paper
                    radius="sm"
                    py={2}
                    ta="center"
                    withBorder
                    style={{
                      borderColor: isSelected ? "var(--mantine-color-blue-5)" : undefined,
                      background: isSelected ? "var(--mantine-color-blue-5)" : undefined,
                    }}
                  >
                    <Text
                      size="10px"
                      c={isSelected ? "white" : slot.available ? undefined : "dimmed"}
                      styles={{
                        root: { textDecoration: slot.available ? undefined : "line-through" },
                      }}
                    >
                      {slot.start}
                    </Text>
                  </Paper>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
