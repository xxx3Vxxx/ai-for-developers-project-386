// PROTOTYPE — throwaway. Variant A «Панель управления» for /admin (issue #12).
// Two columns: an always-visible creation form on the left, a dense meetings table on
// the right. Primary affordance: the form is never hidden; meetings are read as rows.
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";

import {
  DURATION_OPTIONS,
  dayLabel,
  dayOf,
  durationMinutesOf,
  emptyDraft,
  formatDuration,
  formatTimeRange,
  invalidDraft,
  serviceTimezone,
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

export function VariantA({ forcedState, onReset }: Props) {
  const store = useAdminStore(forcedState);
  const [draft, setDraft] = useState<EventTypeDraft>(emptyDraft);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (forcedState === "invalid") {
      setDraft(invalidDraft);
      setErrors(validateEventTypeDraft(invalidDraft));
    }
  }, [forcedState]);

  const submit = () => {
    const result = store.createEventType(draft);
    if (result.ok) {
      setDraft(emptyDraft);
      setErrors({});
    } else {
      setErrors(result.fields);
    }
  };

  const loading = store.phase === "loading";

  return (
    <Container size="lg" py="xl" pb={96}>
      <Stack gap="lg">
        <div>
          <Title order={1} fz="h2">
            Админка
          </Title>
          <Text c="dimmed" size="sm">
            Типы событий и предстоящие встречи · {serviceTimezone}
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
          <Grid gap="lg">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Stack gap="lg">
                <Card withBorder radius="md" padding="lg">
                  <Stack gap="sm">
                    <Title order={2} fz="lg">
                      Новый тип события
                    </Title>
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
                    <Button onClick={submit} disabled={loading}>
                      Создать тип
                    </Button>
                  </Stack>
                </Card>

                <Card withBorder radius="md" padding="lg">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Title order={3} fz="md">
                        Типы событий
                      </Title>
                      <Badge variant="light">{store.eventTypes.length}</Badge>
                    </Group>
                    {loading ? (
                      <Skeleton height={56} radius="sm" />
                    ) : (
                      store.eventTypes.map((type) => (
                        <Group
                          key={type.id}
                          justify="space-between"
                          wrap="nowrap"
                          align="flex-start"
                        >
                          <div>
                            <Text fw={600} size="sm">
                              {type.title}
                            </Text>
                            {type.description && (
                              <Text c="dimmed" size="xs">
                                {type.description}
                              </Text>
                            )}
                          </div>
                          <Badge variant="default">{formatDuration(type.durationMinutes)}</Badge>
                        </Group>
                      ))
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 7 }}>
              <Card withBorder radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between" align="baseline">
                    <Title order={2} fz="lg">
                      Предстоящие встречи
                    </Title>
                    <Text c="dimmed" size="xs">
                      по времени начала
                    </Text>
                  </Group>

                  {loading ? (
                    <Stack gap="xs">
                      {[0, 1, 2, 3].map((row) => (
                        <Skeleton key={row} height={40} radius="sm" />
                      ))}
                    </Stack>
                  ) : store.bookings.length === 0 ? (
                    <Text c="dimmed" size="sm" ta="center" py="xl">
                      Пока нет предстоящих встреч. Список заполнится, как только гости запишутся.
                    </Text>
                  ) : (
                    <Table highlightOnHover verticalSpacing="sm">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Когда</Table.Th>
                          <Table.Th>Тип</Table.Th>
                          <Table.Th>Гость</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {store.bookings.map((booking) => (
                          <Table.Tr key={booking.id}>
                            <Table.Td>
                              <Text size="sm" fw={600}>
                                {formatTimeRange(booking)}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {dayLabel(dayOf(booking.start))}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{booking.eventTypeTitle}</Text>
                              <Text size="xs" c="dimmed">
                                {formatDuration(durationMinutesOf(booking))}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{booking.guestName}</Text>
                              <Text size="xs" c="dimmed">
                                {booking.guestEmail}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
