// PROTOTYPE — throwaway. Variant C «Пульт с панелью» for /admin (issue #12).
// Creation lives in a slide-over drawer behind one button; the canvas is a left rail of
// types plus a day-grouped timeline with a "now" marker. The form is never on the page.
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  Grid,
  Group,
  Paper,
  Select,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useEffect, useState } from "react";

import {
  DURATION_OPTIONS,
  dayLabel,
  durationMinutesOf,
  emptyDraft,
  formatDuration,
  formatTime,
  formatWeekday,
  groupByDay,
  invalidDraft,
  isOngoing,
  todayISO,
  validateEventTypeDraft,
  type EventTypeDraft,
  type FieldErrors,
} from "./mock";
import type { PrototypeState } from "./states";
import { useAdminStore } from "./useAdminStore";

type Props = { forcedState: PrototypeState; onReset: () => void };

const durationData = DURATION_OPTIONS.map((minutes) => ({
  value: String(minutes),
  label: formatDuration(minutes),
}));

export function VariantC({ forcedState, onReset }: Props) {
  const store = useAdminStore(forcedState);
  const [draft, setDraft] = useState<EventTypeDraft>(emptyDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (forcedState === "invalid") {
      setDraft(invalidDraft);
      setErrors(validateEventTypeDraft(invalidDraft));
      setDrawerOpen(true);
    }
  }, [forcedState]);

  const submit = () => {
    const result = store.createEventType(draft);
    if (result.ok) {
      setDraft(emptyDraft);
      setErrors({});
      setDrawerOpen(false);
    } else {
      setErrors(result.fields);
    }
  };

  const loading = store.phase === "loading";
  const groups = groupByDay(store.bookings);

  return (
    <Container size="xl" py="xl" pb={96}>
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} fz="h2">
              Админка
            </Title>
            <Text c="dimmed" size="sm">
              Типы событий и предстоящие встречи
            </Text>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>+ Новый тип</Button>
        </Group>

        {forcedState === "success" && store.lastCreated && (
          <Alert color="teal" title="Тип события создан" withCloseButton onClose={onReset}>
            «{store.lastCreated.title}» · {formatDuration(store.lastCreated.durationMinutes)} — уже
            доступен для записи.
          </Alert>
        )}

        {store.phase === "error" ? (
          <Alert color="red" title="Не удалось загрузить данные">
            <Group justify="space-between" align="center">
              <Text size="sm">Сервер не ответил. Это демонстрация состояния ошибки.</Text>
              <Button size="xs" variant="light" color="red" onClick={onReset}>
                Повторить
              </Button>
            </Group>
          </Alert>
        ) : (
          <Grid gap="xl">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Paper withBorder radius="md" p="sm">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb="xs">
                  Типы событий
                </Text>
                {loading ? (
                  <Skeleton height={120} radius="sm" />
                ) : (
                  <Stack gap={6}>
                    {store.eventTypes.map((type) => (
                      <UnstyledButton
                        key={type.id}
                        p="xs"
                        style={{
                          borderRadius: 8,
                          border: "1px solid var(--mantine-color-gray-2)",
                          display: "block",
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap" gap="xs">
                          <Text size="sm" fw={600} lineClamp={1}>
                            {type.title}
                          </Text>
                          <Badge size="xs" variant="default">
                            {formatDuration(type.durationMinutes)}
                          </Badge>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 9 }}>
              <Paper withBorder radius="md" p="lg">
                <Group justify="space-between" align="baseline" mb="md">
                  <Title order={2} fz="lg">
                    Предстоящие встречи
                  </Title>
                  <Text c="dimmed" size="xs">
                    по времени начала
                  </Text>
                </Group>

                {loading ? (
                  <Skeleton height={220} radius="sm" />
                ) : groups.length === 0 ? (
                  <Stack align="center" gap={4} py="xl">
                    <Text fw={600}>Пока нет предстоящих встреч</Text>
                    <Text c="dimmed" size="sm" ta="center">
                      Список заполнится, как только гости запишутся на слоты.
                    </Text>
                  </Stack>
                ) : (
                  <Stack gap="lg">
                    {groups.map((group) => (
                      <Box key={group.date}>
                        <Group gap="xs" align="baseline" mb="xs">
                          <Text fw={700} size="sm">
                            {dayLabel(group.date)}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {formatWeekday(group.date)}
                          </Text>
                          {group.date === todayISO && (
                            <Badge size="xs" color="grape" variant="light">
                              сегодня
                            </Badge>
                          )}
                        </Group>

                        <Box
                          style={{
                            borderLeft: "2px solid var(--mantine-color-gray-3)",
                            paddingLeft: 16,
                            marginLeft: 5,
                          }}
                        >
                          <Stack gap="md">
                            {group.items.map((booking) => {
                              const ongoing = isOngoing(booking);
                              return (
                                <Box key={booking.id} style={{ position: "relative" }}>
                                  <Box
                                    style={{
                                      position: "absolute",
                                      left: -22,
                                      top: 6,
                                      width: 10,
                                      height: 10,
                                      borderRadius: 999,
                                      background: ongoing
                                        ? "var(--mantine-color-grape-6)"
                                        : "var(--mantine-color-gray-5)",
                                    }}
                                  />
                                  <Group gap="xs" align="baseline">
                                    <Text fw={700} size="sm">
                                      {formatTime(booking.start)}–{formatTime(booking.end)}
                                    </Text>
                                    <Badge size="xs" variant="light">
                                      {formatDuration(durationMinutesOf(booking))}
                                    </Badge>
                                    {ongoing && (
                                      <Badge size="xs" color="grape" variant="filled">
                                        идёт сейчас
                                      </Badge>
                                    )}
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
                )}
              </Paper>
            </Grid.Col>
          </Grid>
        )}
      </Stack>

      <Drawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position="right"
        size="md"
        title="Новый тип события"
      >
        <Stack gap="sm">
          <TextInput
            label="Название"
            placeholder="Например, «Демо-звонок»"
            withAsterisk
            value={draft.title}
            error={errors.title}
            onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
          />
          <Textarea
            label="Описание"
            placeholder="Необязательно"
            autosize
            minRows={2}
            maxRows={4}
            value={draft.description}
            error={errors.description}
            onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })}
          />
          <Select
            label="Длительность"
            data={durationData}
            allowDeselect={false}
            value={String(draft.durationMinutes)}
            error={errors.durationMinutes}
            onChange={(value) => value && setDraft({ ...draft, durationMinutes: Number(value) })}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setDrawerOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={loading}>
              Создать тип
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </Container>
  );
}
