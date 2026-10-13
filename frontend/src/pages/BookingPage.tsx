import { Button, Container, Group, Stepper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";

import { useConfig } from "../api/config";
import type { EventType } from "../api/event-types";
import { useEventTypes } from "../api/event-types";
import { useSlots } from "../api/slots";
import { DateTimeStep } from "../components/book/DateTimeStep";
import { TypeStep } from "../components/book/TypeStep";
import { book } from "../copy/book";

const STEP_COUNT = Object.keys(book.steps).length;
/** Индекс шага «Дата и время». */
const DATE_TIME_STEP = 1;

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
 * (ADR-0016). Реализованы шаги «Тип» (#27) и «Дата и время» (#28); остальные —
 * каркас, который наполняют следующие тикеты.
 */
export function BookingPage() {
  const [active, setActive] = useState(0);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  const { state: typesState, retry: retryTypes } = useEventTypes();
  const { state: configState, retry: retryConfig } = useConfig();

  // Пока дата не выбрана, сетка строится для сегодняшнего дня из конфигурации.
  const date = selectedDate ?? (configState.status === "ready" ? configState.config.today : null);
  const { state: slotsState, retry: retrySlots } = useSlots(selectedType?.id ?? null, date);

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

  function selectType(eventType: EventType) {
    setSelectedType(eventType);
    // Смена типа пересобирает сетку — прежний слот перестаёт быть валидным.
    setSelectedStart(null);
  }

  function selectDate(next: string) {
    setSelectedDate(next);
    // Другая дата — другая сетка: прежний слот перестаёт быть валидным.
    setSelectedStart(null);
  }

  // Шаг «Тип» требует выбора типа, «Дата и время» — доступного выбранного слота;
  // дальше — заглушки, которые листаются до последнего шага.
  const selectedSlotAvailable =
    slotsState.status === "ready" &&
    slotsState.slots.some((slot) => slot.start === selectedStart && slot.available);
  const canGoNext =
    active === 0
      ? selectedType !== null
      : active === DATE_TIME_STEP
        ? selectedSlotAvailable
        : active < STEP_COUNT - 1;

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>{book.title}</Title>
        <Stepper active={active}>
          <Stepper.Step label={book.steps.type.label} description={book.steps.type.description}>
            <StepPanel ref={headingRef} title={book.steps.type.label}>
              <TypeStep
                state={typesState}
                selectedId={selectedType?.id ?? null}
                onSelect={selectType}
                onRetry={retryTypes}
              />
            </StepPanel>
          </Stepper.Step>
          <Stepper.Step
            label={book.steps.dateTime.label}
            description={book.steps.dateTime.description}
          >
            <StepPanel ref={headingRef} title={book.steps.dateTime.label}>
              <DateTimeStep
                configState={configState}
                onRetryConfig={retryConfig}
                selectedDate={selectedDate}
                onSelectDate={selectDate}
                selectedStart={selectedStart}
                onSelectStart={(slot) => setSelectedStart(slot.start)}
                slotsState={slotsState}
                onRetrySlots={retrySlots}
              />
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
