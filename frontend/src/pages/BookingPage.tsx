import { Card, Container, Stack, Text, Title } from "@mantine/core";

export function BookingPage() {
  return (
    <Container size="md" py="xl">
      <Card withBorder shadow="sm" padding="xl" radius="md">
        <Stack gap="sm">
          <Title order={1}>Запись на звонок</Title>
          <Text c="dimmed">Страница записи в разработке.</Text>
        </Stack>
      </Card>
    </Container>
  );
}
