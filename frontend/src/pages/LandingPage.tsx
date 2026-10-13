import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  List,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "react-router-dom";

import { useConfig } from "../api/config";
import { common } from "../copy/common";
import { landing } from "../copy/landing";

export function LandingPage() {
  const { state, retry } = useConfig();

  return (
    <Container size="lg" py="xl">
      <Grid gap="xl" align="center">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack align="flex-start" gap="lg">
            <Badge variant="default" size="lg" radius="sm">
              {landing.badge}
            </Badge>
            <Title order={1} fz={{ base: 48, md: 72 }}>
              {landing.title}
            </Title>
            <Text size="lg" c="dimmed" maw={520}>
              {landing.subtitle}
            </Text>
            <Button component={Link} to="/book" size="md">
              {landing.cta}
            </Button>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder shadow="sm" padding="xl" radius="md">
            <Stack gap="md">
              <Title order={2} fz="xl">
                {landing.capabilitiesTitle}
              </Title>
              {state.status === "error" && (
                <Alert role="alert" color="red" title={common.readError.title}>
                  <Stack gap="sm" align="flex-start">
                    <Text size="sm">{common.readError.description}</Text>
                    <Button variant="light" onClick={retry}>
                      {common.readError.retry}
                    </Button>
                  </Stack>
                </Alert>
              )}
              <List spacing="xs" size="md">
                {state.status === "loading" && (
                  <List.Item>
                    <Loader role="status" aria-label={common.loading} size="xs" />
                  </List.Item>
                )}
                {state.status === "ready" && (
                  <List.Item>{landing.capabilities.window(state.config)}</List.Item>
                )}
                <List.Item>{landing.capabilities.types}</List.Item>
                <List.Item>{landing.capabilities.exclusive}</List.Item>
              </List>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
