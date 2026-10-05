import { Badge, Button, Card, Center, Group, Stack, Text, Title } from "@mantine/core";

export function App() {
  return (
    <Center mih="100vh" p="md">
      <Card withBorder shadow="sm" padding="xl" radius="md" w={480} maw="100%">
        <Stack gap="md">
          <Title order={1}>Календарь звонков</Title>
          <Text c="dimmed">
            Каркас приложения готов. Здесь появится сервис бронирования календаря.
          </Text>
          <Group gap="xs">
            <Badge variant="light">Vite</Badge>
            <Badge variant="light">React</Badge>
            <Badge variant="light">Mantine</Badge>
          </Group>
          <Button variant="filled" disabled>
            Функционал скоро
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
