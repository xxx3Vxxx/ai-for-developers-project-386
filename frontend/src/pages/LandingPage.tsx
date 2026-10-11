import { Badge, Button, Card, Container, Grid, List, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

const capabilities = [
  "Фиксированные 30-минутные слоты с 09:00 до 18:00.",
  "Проверка конфликта при бронировании.",
  "Просмотр предстоящих событий в отдельном разделе.",
];

export function LandingPage() {
  return (
    <Container size="lg" py="xl">
      <Grid gap="xl" align="center">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack align="flex-start" gap="lg">
            <Badge variant="default" size="lg" radius="sm">
              БЫСТРАЯ ЗАПИСЬ НА ЗВОНОК
            </Badge>
            <Title order={1} fz={{ base: 48, md: 72 }}>
              Calendar
            </Title>
            <Text size="lg" c="dimmed" maw={520}>
              Один экран, понятные слоты, быстрая бронь. Выберите время и запишитесь на звонок без
              лишних шагов.
            </Text>
            <Button component={Link} to="/book" size="md">
              Записаться →
            </Button>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder shadow="sm" padding="xl" radius="md">
            <Stack gap="md">
              <Title order={2} fz="xl">
                Что доступно прямо сейчас
              </Title>
              <List spacing="xs" size="md">
                {capabilities.map((item) => (
                  <List.Item key={item}>{item}</List.Item>
                ))}
              </List>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
