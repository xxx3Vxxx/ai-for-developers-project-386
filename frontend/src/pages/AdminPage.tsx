import { Alert, Button, Container, Grid, Stack, Text, Title } from "@mantine/core";

import { useBookings } from "../api/bookings";
import { useConfig } from "../api/config";
import { useEventTypes } from "../api/event-types";
import { MeetingFeed } from "../components/admin/MeetingFeed";
import { TypeRail } from "../components/admin/TypeRail";
import { admin } from "../copy/admin";
import { common } from "../copy/common";

/**
 * Кабинет владельца `/admin` (ADR-0012): рельс типов событий (только просмотр) и
 * лента предстоящих встреч по суткам зоны сервиса. Экран читает
 * `GET /api/event-types`, `GET /api/bookings` и `GET /api/config`; при сбое любого
 * чтения обе области заменяет один алерт с «Повторить» (ADR-0012). Создание типа
 * живёт в выдвижной панели (отдельный тикет).
 */
export function AdminPage() {
  const types = useEventTypes();
  const bookings = useBookings();
  const config = useConfig();

  const failed =
    types.state.status === "error" ||
    bookings.state.status === "error" ||
    config.state.status === "error";

  const eventTypes = types.state.status === "ready" ? types.state.eventTypes : null;
  const upcoming = bookings.state.status === "ready" ? bookings.state.bookings : null;
  const today = config.state.status === "ready" ? config.state.config.today : null;

  function retry() {
    types.retry();
    bookings.retry();
    config.retry();
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={1} fz="h2">
          {admin.title}
        </Title>
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
    </Container>
  );
}
