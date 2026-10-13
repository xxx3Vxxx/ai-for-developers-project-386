import { Alert, Button, Container, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

import { useBookings } from "../api/bookings";
import { useConfig } from "../api/config";
import { useEventTypes, type EventType } from "../api/event-types";
import { MeetingFeed } from "../components/admin/MeetingFeed";
import {
  NEW_EVENT_TYPE_DRAWER_ID,
  NewEventTypeDrawer,
} from "../components/admin/NewEventTypeDrawer";
import { TypeRail } from "../components/admin/TypeRail";
import { admin } from "../copy/admin";
import { common } from "../copy/common";
import { workWindowMinutes } from "../validation";

/**
 * Кабинет владельца `/admin` (ADR-0012): шапка с кнопкой «+ Новый тип», рельс
 * типов событий и лента предстоящих встреч по суткам зоны сервиса. Экран читает
 * `GET /api/event-types`, `GET /api/bookings` и `GET /api/config`; при сбое любого
 * чтения обе области заменяет один алерт с «Повторить» (ADR-0012). Создание типа
 * живёт в выдвижной панели и по успеху обновляет рельс.
 */
export function AdminPage() {
  const types = useEventTypes();
  const bookings = useBookings();
  const config = useConfig();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [created, setCreated] = useState<EventType | null>(null);

  const failed =
    types.state.status === "error" ||
    bookings.state.status === "error" ||
    config.state.status === "error";

  const eventTypes = types.state.status === "ready" ? types.state.eventTypes : null;
  const upcoming = bookings.state.status === "ready" ? bookings.state.bookings : null;
  const today = config.state.status === "ready" ? config.state.config.today : null;
  // Верхняя граница длительности — длина рабочего окна из конфигурации (ADR-0003).
  const maxDurationMinutes =
    config.state.status === "ready"
      ? workWindowMinutes(
          config.state.config.workingWindow.start,
          config.state.config.workingWindow.end,
        )
      : null;

  function retry() {
    types.retry();
    bookings.retry();
    config.retry();
  }

  function handleCreated(eventType: EventType) {
    setCreated(eventType);
    setDrawerOpen(false);
    // Созданный тип сразу доступен гостям — обновляем рельс.
    types.retry();
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={1} fz="h2">
            {admin.title}
          </Title>
          <Button
            disabled={maxDurationMinutes === null}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            aria-controls={NEW_EVENT_TYPE_DRAWER_ID}
            onClick={() => setDrawerOpen(true)}
          >
            {admin.create.action}
          </Button>
        </Group>
        {created ? (
          <Alert
            role="status"
            color="teal"
            title={admin.create.success.title}
            withCloseButton
            onClose={() => setCreated(null)}
          >
            <Text size="sm">
              {admin.create.success.description(
                created.title,
                admin.duration(created.durationMinutes),
              )}
            </Text>
          </Alert>
        ) : null}
        {failed ? (
          <Alert role="alert" color="red" title={common.readError.title}>
            <Stack gap="sm" align="flex-start">
              <Text size="sm">{common.readError.description}</Text>
              <Button variant="light" onClick={retry}>
                {common.readError.retry}
              </Button>
            </Stack>
          </Alert>
        ) : (
          <Grid gap="xl">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TypeRail eventTypes={eventTypes} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 9 }}>
              <MeetingFeed bookings={upcoming} today={today} />
            </Grid.Col>
          </Grid>
        )}
      </Stack>
      {maxDurationMinutes !== null ? (
        <NewEventTypeDrawer
          opened={drawerOpen}
          maxDurationMinutes={maxDurationMinutes}
          onClose={() => setDrawerOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </Container>
  );
}
