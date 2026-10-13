import { Anchor, Box, Container, Group, Text } from "@mantine/core";
import { Link } from "react-router-dom";

import { common } from "../copy/common";

export function Header() {
  return (
    <Box component="header" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
      <Container size="lg" py="md">
        <Group component="nav" aria-label={common.nav} justify="space-between" align="center">
          <Text component={Link} to="/" fw={700} c="inherit" style={{ textDecoration: "none" }}>
            {common.brand}
          </Text>
          <Group gap="lg">
            <Anchor component={Link} to="/book" c="dimmed">
              {common.book}
            </Anchor>
            <Anchor component={Link} to="/admin" c="dimmed">
              {common.ownerCabinet}
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
