// PROTOTYPE — throwaway. Variant A: linear stepper
// (тип → дата и время → данные гостя → подтверждение → успех).
import {
  Badge,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useState, type ReactNode } from "react";

import { ConflictBlock, EmptyBlock, ErrorBlock, LoadingBlock, SuccessBlock } from "./BookStates";
import {
  demoBooking,
  eventTypes,
  formatDayShort,
  formatLong,
  formatWeekday,
  minutesToHHMM,
  slotsFor,
  todayISO,
  windowDates,
  type EventType,
} from "./mock";
import type { PrototypeState } from "./PrototypeSwitcher";

export type VariantProps = {
  forcedState: PrototypeState;
  onReset: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

export function VariantA({ forcedState, onReset }: VariantProps) {
  const demoSeed = forcedState === "conflict" || forcedState === "empty";
  const [active, setActive] = useState(forcedState === "conflict" ? 3 : demoSeed ? 1 : 0);
  const [eventType, setEventType] = useState<EventType | null>(demoSeed ? eventTypes[1] : null);
  const [date, setDate] = useState<string | null>(demoSeed ? windowDates[3] : null);
  const [start, setStart] = useState<string | null>(forcedState === "conflict" ? "14:00" : null);
  const [name, setName] = useState(forcedState === "conflict" ? "Иван Петров" : "");
  const [email, setEmail] = useState(forcedState === "conflict" ? "ivan@example.com" : "");
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [conflict] = useState(forcedState === "conflict");
  const [booking, setBooking] = useState<ReturnType<typeof demoBooking> | null>(null);

  if (booking) {
    return <Shell><SuccessBlock booking={booking} /></Shell>;
  }
  if (forcedState === "success") {
    return (
      <Shell>
        <SuccessBlock booking={demoBooking()} />
      </Shell>
    );
  }
  if (forcedState === "loading") {
    return (
      <Shell>
        <LoadingBlock />
      </Shell>
    );
  }
  if (forcedState === "error") {
    return (
      <Shell>
        <ErrorBlock onRetry={onReset} />
      </Shell>
    );
  }

  const slots = eventType && date ? slotsFor(eventType, date) : [];
  const hasAvailable = slots.some((slot) => slot.available);
  const showEmpty = forcedState === "empty" || (Boolean(date) && !hasAvailable);

  const emailError = emailTouched && !EMAIL_RE.test(email.trim()) ? "Проверьте email" : undefined;
  const nameError = nameTouched && name.trim().length === 0 ? "Укажите имя" : undefined;
  const detailsValid = name.trim().length > 0 && EMAIL_RE.test(email.trim());

  const endTime = eventType && start ? minutesToHHMM(toMinutes(start) + eventType.durationMinutes) : "—";

  const submit = () => {
    if (forcedState === "conflict" || !eventType || !date || !start) return;
    setBooking(demoBooking({ eventType, date, start, guestName: name.trim(), guestEmail: email.trim() }));
  };

  return (
    <Shell>
      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
        <Stepper.Step label="Тип" description="Что за встреча">
          <Stack gap="sm" mt="md">
            {eventTypes.map((et) => {
              const selected = eventType?.id === et.id;
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
                    radius="md"
                    p="md"
                    style={{
                      borderColor: selected ? "var(--mantine-color-blue-5)" : undefined,
                      borderWidth: selected ? 2 : 1,
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <div>
                        <Text fw={600}>{et.title}</Text>
                        <Text size="sm" c="dimmed">
                          {et.description}
                        </Text>
                      </div>
                      <Badge variant="light" radius="sm">
                        {et.durationMinutes} мин
                      </Badge>
                    </Group>
                  </Paper>
                </UnstyledButton>
              );
            })}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Дата и время" description="Свободный слот">
          <Stack gap="md" mt="md">
            <SimpleGrid cols={{ base: 3, sm: 7 }} spacing="xs">
              {windowDates.map((d) => {
                const selected = date === d;
                return (
                  <UnstyledButton
                    key={d}
                    onClick={() => {
                      setDate(d);
                      setStart(null);
                    }}
                  >
                    <Paper
                      withBorder
                      radius="sm"
                      p="xs"
                      ta="center"
                      style={{
                        borderColor: selected ? "var(--mantine-color-blue-5)" : undefined,
                        borderWidth: selected ? 2 : 1,
                      }}
                    >
                      <Text size="xs" c="dimmed">
                        {formatWeekday(d)}
                      </Text>
                      <Text fw={600} size="sm">
                        {formatDayShort(d)}
                      </Text>
                      <Text size="10px" c={d === todayISO ? "blue" : "transparent"}>
                        сегодня
                      </Text>
                    </Paper>
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>

            {!date && (
              <Text c="dimmed" size="sm">
                Выберите дату, чтобы увидеть свободные слоты.
              </Text>
            )}
            {date && showEmpty && <EmptyBlock dateLabel={formatLong(date)} />}
            {date && !showEmpty && (
              <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
                {slots.map((slot) => (
                  <Button
                    key={slot.start}
                    variant={start === slot.start ? "filled" : "default"}
                    disabled={!slot.available}
                    onClick={() => setStart(slot.start)}
                    styles={{ label: { textDecoration: slot.available ? undefined : "line-through" } }}
                  >
                    {slot.start}
                  </Button>
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Ваши данные" description="Имя и email">
          <Stack gap="md" mt="md" maw={420}>
            <TextInput
              label="Имя"
              placeholder="Как к вам обращаться"
              required
              value={name}
              error={nameError}
              onBlur={() => setNameTouched(true)}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              value={email}
              error={emailError}
              onBlur={() => setEmailTouched(true)}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <Text size="xs" c="dimmed">
              Email нужен только чтобы подтвердить встречу. Уведомления в этом прототипе не
              отправляются.
            </Text>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Подтверждение" description="Проверьте детали">
          <Stack gap="md" mt="md">
            <Paper withBorder radius="md" p="md">
              <Grid gap="xs">
                <SummaryRow label="Тип" value={eventType?.title ?? "—"} />
                <SummaryRow label="Когда" value={date ? formatLong(date) : "—"} />
                <SummaryRow label="Время" value={start ? `${start}–${endTime}` : "—"} />
                <SummaryRow label="Гость" value={`${name || "—"} · ${email || "—"}`} />
              </Grid>
            </Paper>
            {conflict && <ConflictBlock onRetry={onReset} />}
            <Button onClick={submit} disabled={conflict} w="fit-content">
              Записаться
            </Button>
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button variant="default" disabled={active === 0} onClick={() => setActive((s) => s - 1)}>
          Назад
        </Button>
        <Button
          disabled={
            active >= 3 ||
            (active === 0 && !eventType) ||
            (active === 1 && (!date || !start || showEmpty)) ||
            (active === 2 && !detailsValid)
          }
          onClick={() => setActive((s) => s + 1)}
        >
          Далее
        </Button>
      </Group>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <Container size="md" py="xl" pb={96}>
      <Stack gap="lg">
        <div>
          <Title order={1}>Запись на звонок</Title>
          <Text c="dimmed" mt={4}>
            Вариант A · линейный мастер: по шагу за раз.
          </Text>
        </div>
        {children}
      </Stack>
    </Container>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Grid.Col span={4}>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      </Grid.Col>
      <Grid.Col span={8}>
        <Text size="sm" fw={500}>
          {value}
        </Text>
      </Grid.Col>
    </>
  );
}
