// PROTOTYPE — throwaway. Shared state renderings for the /book wizard exploration (issue #11).
import {
  Alert,
  Button,
  Center,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";

import { formatLong, type Booking } from "./mock";

export function LoadingBlock({ rows = 8 }: { rows?: number }) {
  return (
    <Stack gap="sm">
      <Skeleton height={24} width="35%" radius="sm" />
      <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="sm">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={40} radius="sm" />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export function EmptyBlock({ dateLabel }: { dateLabel?: string }) {
  return (
    <Paper withBorder radius="md" p="xl">
      <Center>
        <Stack align="center" gap="xs" maw={360}>
          <Text fz={28}>🗓️</Text>
          <Text fw={600}>Нет свободных слотов</Text>
          <Text c="dimmed" size="sm" ta="center">
            {dateLabel ? `На ${dateLabel} всё занято. ` : ""}Выберите другую дату в окне записи.
          </Text>
        </Stack>
      </Center>
    </Paper>
  );
}

export function ErrorBlock({ onRetry }: { onRetry?: () => void }) {
  return (
    <Alert color="red" variant="light" title="Не удалось загрузить слоты">
      <Stack gap="sm">
        <Text size="sm">Сервис временно недоступен. Обновите страницу или попробуйте позже.</Text>
        {onRetry && (
          <Button variant="light" color="red" size="xs" w="fit-content" onClick={onRetry}>
            Повторить
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function ConflictBlock({ onRetry }: { onRetry?: () => void }) {
  return (
    <Alert color="orange" variant="light" title="Это время уже занято">
      <Stack gap="sm">
        <Text size="sm">
          Пока вы заполняли данные, слот забронировали. Выберите другое время — запись не
          создана.
        </Text>
        {onRetry && (
          <Button variant="light" color="orange" size="xs" w="fit-content" onClick={onRetry}>
            Выбрать другое время
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function SuccessBlock({ booking }: { booking: Booking }) {
  return (
    <Paper withBorder radius="md" p="xl">
      <Stack gap="md">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon color="green" variant="light" size="lg" radius="xl">
            <Text fw={700}>✓</Text>
          </ThemeIcon>
          <div>
            <Title order={3} fz="lg">
              Вы записаны
            </Title>
            <Text c="dimmed" size="sm">
              Слот закреплён за вами, отмены в этом прототипе нет.
            </Text>
          </div>
        </Group>
        <Stack gap={4}>
          <Text fw={600}>
            {booking.eventType.title} · {booking.eventType.durationMinutes} мин
          </Text>
          <Text>
            {formatLong(booking.date)}, {booking.start}–{booking.end}
          </Text>
          <Text c="dimmed" size="sm">
            {booking.guestName} · {booking.guestEmail}
          </Text>
        </Stack>
        <Text c="dimmed" size="xs">
          Время указано в зоне сервиса (Europe/Moscow).
        </Text>
      </Stack>
    </Paper>
  );
}
