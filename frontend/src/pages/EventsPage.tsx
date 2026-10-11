import { Card, Container, Stack, Text, Title } from "@mantine/core";

export function EventsPage() {
  return (
    <Container size="md" py="xl">
      <Card withBorder shadow="sm" padding="xl" radius="md">
        <Stack gap="sm">
          <Title order={1}>Предстоящие события</Title>
          <Text c="dimmed">Список предстоящих событий в разработке.</Text>
        </Stack>
      </Card>
    </Container>
  );
}
