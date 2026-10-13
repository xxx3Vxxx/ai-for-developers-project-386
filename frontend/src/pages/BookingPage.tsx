import { Button, Container, Group, Stepper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";

import type { EventType } from "../api/event-types";
import { useEventTypes } from "../api/event-types";
import { TypeStep } from "../components/book/TypeStep";
import { book } from "../copy/book";

const STEP_COUNT = Object.keys(book.steps).length;

interface StepPanelProps {
  /** Заголовок шага; получает фокус при переходе «Назад»/«Далее» (ADR-0016). */
  ref?: Ref<HTMLHeadingElement>;
  title: string;
  children: ReactNode;
}

function StepPanel({ ref, title, children }: StepPanelProps) {
  return (
    <Stack gap="md" mt="md">
      <Title order={2} fz="h3" tabIndex={-1} ref={ref}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}

/**
 * Мастер записи `/book`: линейный `Stepper` из четырёх шагов с навигацией
 * «Назад»/«Далее» (ADR-0011). `Stepper` — только индикатор, недостигнутые шаги
 * не фокусируемы, а фокус при переходах уезжает на заголовок нового шага
 * (ADR-0016). Реализован шаг «Тип» (#27); остальные — каркас, который наполняют
 * следующие тикеты.
 */
export function BookingPage() {
  const [active, setActive] = useState(0);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const { state, retry } = useEventTypes();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousActive = useRef(active);

  useEffect(() => {
    // На первом рендере фокус не трогаем — только на переходах (устойчиво к
    // двойному вызову эффектов в StrictMode).
    if (previousActive.current !== active) {
      headingRef.current?.focus();
      previousActive.current = active;
    }
  }, [active]);

  // Шаг «Тип» требует выбора; дальше шаги-заглушки листаются до последнего.
  const canGoNext = active === 0 ? selectedType !== null : active < STEP_COUNT - 1;

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>{book.title}</Title>
        <Stepper active={active}>
          <Stepper.Step label={book.steps.type.label} description={book.steps.type.description}>
            <StepPanel ref={headingRef} title={book.steps.type.label}>
              <TypeStep
                state={state}
                selectedId={selectedType?.id ?? null}
                onSelect={setSelectedType}
                onRetry={retry}
              />
            </StepPanel>
          </Stepper.Step>
          <Stepper.Step
            label={book.steps.dateTime.label}
            description={book.steps.dateTime.description}
          >
            <StepPanel ref={headingRef} title={book.steps.dateTime.label}>
              <Text c="dimmed">{book.stepInProgress}</Text>
            </StepPanel>
          </Stepper.Step>
          <Stepper.Step
            label={book.steps.details.label}
            description={book.steps.details.description}
          >
            <StepPanel ref={headingRef} title={book.steps.details.label}>
              <Text c="dimmed">{book.stepInProgress}</Text>
            </StepPanel>
          </Stepper.Step>
          <Stepper.Step
            label={book.steps.confirmation.label}
            description={book.steps.confirmation.description}
          >
            <StepPanel ref={headingRef} title={book.steps.confirmation.label}>
              <Text c="dimmed">{book.stepInProgress}</Text>
            </StepPanel>
          </Stepper.Step>
        </Stepper>
        <Group justify="space-between">
          <Button
            variant="default"
            disabled={active === 0}
            onClick={() => setActive((step) => step - 1)}
          >
            {book.nav.back}
          </Button>
          <Button disabled={!canGoNext} onClick={() => setActive((step) => step + 1)}>
            {book.nav.next}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
