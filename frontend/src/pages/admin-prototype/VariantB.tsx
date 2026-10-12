// PROTOTYPE — throwaway. Variant B «Секции в столбец» for /admin (issue #12).
// One narrow column, two stacked sections. Types are rows with an inline form that
// unfolds in place; meetings are cards grouped by day, not a table.
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Container,
  Divider,
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
} from "@mantine/core";
import { useEffect, useState } from "react";

import {
  DURATION_OPTIONS,
  dayLabel,
  durationMinutesOf,
  emptyDraft,
  formatDayLong,
  formatDuration,
  formatTime,
  formatWeekday,
  groupByDay,
  invalidDraft,
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

export function VariantB({ forcedState, onReset }: Props) {
  const store = useAdminStore(forcedState);
  const [draft, setDraft] = useState<EventTypeDraft>(emptyDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (forcedState === "invalid") {
      setDraft(invalidDraft);
      setErrors(validateEventTypeDraft(invalidDraft));
      setFormOpen(true);
    }
  }, [forcedState]);

  const submit = () => {
    const result = store.createEventType(draft);
    if (result.ok) {
      setDraft(emptyDraft);
      setErrors({});
      setFormOpen(false);
    } else {
      setErrors(result.fields);
      setFormOpen(true);
    }
  };

  const loading = store.phase === "loading";
  const groups = groupByDay(store.bookings);

  return (
    <Container size="md" py="xl" pb={96}>
      <Stack gap="xl">
        <div>
          <Title order={1} fz="h2">
            Админка
          </Title>
          <Text c="dimmed" size="sm">
            Типы событий и предстоящие встречи
          </Text>
        </div>

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
          <>
            <section>
              <Group justify="space-between" align="center" mb="sm">
                <Group gap="xs" align="baseline">
                  <Title order={2} fz="lg">
                    Типы событий
                  </Title>
                  <Text c="dimmed" size="xs">
                    {store.eventTypes.length}
                  </Text>
                </Group>
                <Button
                  size="xs"
                  variant={formOpen ? "light" : "filled"}
                  onClick={() => setFormOpen((open) => !open)}
                >
                  {formOpen ? "Свернуть" : "+ Добавить тип"}
                </Button>
              </Group>

              <Collapse expanded={formOpen}>
                <Paper withBorder radius="md" p="md" mb="sm">
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
                      onChange={(event) =>
                        setDraft({ ...draft, description: event.currentTarget.value })
                      }
                    />
                    <Grid gap="sm" align="end">
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <Select
                          label="Длительность"
                          data={durationData}
                          allowDeselect={false}
                          value={String(draft.durationMinutes)}
                          error={errors.durationMinutes}
                          onChange={(value) =>
                            value && setDraft({ ...draft, durationMinutes: Number(value) })
                          }
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <Button fullWidth onClick={submit} disabled={loading}>
                          Создать тип
                        </Button>
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Paper>
              </Collapse>

              {loading ? (
                <Skeleton height={120} radius="sm" />
              ) : (
                <Stack gap={0}>
                  {store.eventTypes.map((type) => (
                    <Group
                      key={type.id}
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                      py="sm"
                      style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
                    >
                      <Stack gap={2}>
                        <Text fw={600} size="sm">
                          {type.title}
                        </Text>
                        {type.description && (
                          <Text c="dimmed" size="xs">
                            {type.description}
                          </Text>
                        )}
                      </Stack>
                      <Badge variant="light" radius="sm">
                        {formatDuration(type.durationMinutes)}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              )}
            </section>

            <Divider />

            <section>
              <Title order={2} fz="lg" mb="sm">
                Предстоящие встречи
              </Title>

              {loading ? (
                <Stack gap="sm">
                  {[0, 1, 2].map((row) => (
                    <Skeleton key={row} height={72} radius="md" />
                  ))}
                </Stack>
              ) : groups.length === 0 ? (
                <Paper withBorder radius="md" p="xl">
                  <Stack align="center" gap={4}>
                    <Text fw={600}>Пока нет предстоящих встреч</Text>
                    <Text c="dimmed" size="sm" ta="center">
                      Список заполнится, как только гости запишутся на слоты.
                    </Text>
                  </Stack>
                </Paper>
              ) : (
                <Stack gap="lg">
                  {groups.map((group) => (
                    <Stack key={group.date} gap="xs">
                      <Group gap="xs" align="baseline">
                        <Text fw={700} size="sm">
                          {dayLabel(group.date)}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {formatWeekday(group.date)} · {formatDayLong(group.date)}
                        </Text>
                        <Badge size="xs" variant="default">
                          {group.items.length}
                        </Badge>
                      </Group>

                      {group.items.map((booking) => (
                        <Card key={booking.id} withBorder radius="md" padding="md">
                          <Group justify="space-between" wrap="nowrap" align="center">
                            <Group gap="md" wrap="nowrap" align="center">
                              <Stack
                                gap={0}
                                align="center"
                                w={64}
                                py={4}
                                style={{
                                  borderRadius: 8,
                                  background: "var(--mantine-color-gray-1)",
                                }}
                              >
                                <Text fw={700} size="sm">
                                  {formatTime(booking.start)}
                                </Text>
                                <Text c="dimmed" size="xs">
                                  {formatTime(booking.end)}
                                </Text>
                              </Stack>
                              <Stack gap={2}>
                                <Text fw={600} size="sm">
                                  {booking.guestName}
                                </Text>
                                <Text c="dimmed" size="xs">
                                  {booking.guestEmail}
                                </Text>
                              </Stack>
                            </Group>
                            <Badge variant="light" radius="sm">
                              {booking.eventTypeTitle} ·{" "}
                              {formatDuration(durationMinutesOf(booking))}
                            </Badge>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  ))}
                </Stack>
              )}
            </section>
          </>
        )}
      </Stack>
    </Container>
  );
}
