import { Anchor, Box, Container, Group, Text } from "@mantine/core";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <Box component="header" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
      <Container size="lg" py="md">
        <Group justify="space-between" align="center">
          <Text component={Link} to="/" fw={700} c="inherit" style={{ textDecoration: "none" }}>
            Calendar
          </Text>
          <Group gap="lg">
            <Anchor component={Link} to="/book" c="dimmed">
              Записаться
            </Anchor>
            <Anchor component={Link} to="/events" c="dimmed">
              Предстоящие события
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
