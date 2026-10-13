import { Button, Container, Group, Stepper, Stack, Title } from "@mantine/core";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";

import { createBooking, type Booking, type BookingError } from "../api/bookings";
import { useConfig } from "../api/config";
import type { EventType } from "../api/event-types";
import { useEventTypes } from "../api/event-types";
import type { Slot } from "../api/slots";
import { useSlots } from "../api/slots";
import { ConfirmationStep } from "../components/book/ConfirmationStep";
import { DateTimeStep } from "../components/book/DateTimeStep";
import { DetailsStep } from "../components/book/DetailsStep";
import type { StepNotice } from "../components/book/StepNotice";
import { SuccessScreen } from "../components/book/SuccessScreen";
import { TypeStep } from "../components/book/TypeStep";
import { book } from "../copy/book";
import { fullDateLabel, instantDate, instantTime } from "../format/date";
import { validateGuestEmail, validateGuestName } from "../validation";

const STEP_COUNT = Object.keys(book.steps).length;
/** Индексы шагов мастера. */
const TYPE_STEP = 0;
const DATE_TIME_STEP = 1;
const DETAILS_STEP = 2;
const CONFIRMATION_STEP = 3;

/** Состояние отправки брони на шаге «Подтверждение». */
type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "conflict" }
  | { status: "unavailable" }
  | { status: "message"; message: string };

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
 * (ADR-0016). Шаги «Тип» (#27), «Дата и время» (#28), «Ваши данные»,
 * «Подтверждение» и экран успеха (#30) с обработкой ошибок записи (ADR-0015).
 */
export function BookingPage() {
  const [active, setActive] = useState(TYPE_STEP);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false });
  const [serverErrors, setServerErrors] = useState<{ name?: string; email?: string }>({});
  const [typeNotice, setTypeNotice] = useState<StepNotice | null>(null);
  const [dateTimeNotice, setDateTimeNotice] = useState<StepNotice | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [booking, setBooking] = useState<Booking | null>(null);

  const { state: typesState, retry: retryTypes } = useEventTypes();
  const { state: configState, retry: retryConfig } = useConfig();

  // Пока дата не выбрана, сетка строится для сегодняшнего дня из конфигурации.
  const date = selectedDate ?? (configState.status === "ready" ? configState.config.today : null);
  const { state: slotsState, retry: retrySlots } = useSlots(selectedType?.id ?? null, date);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const previousActive = useRef(active);

  useEffect(() => {
    // На первом рендере фокус не трогаем — только на переходах (устойчиво к
    // двойному вызову эффектов в StrictMode).
    if (previousActive.current !== active) {
      headingRef.current?.focus();
      previousActive.current = active;
    }
  }, [active]);

  useEffect(() => {
    if (booking) successRef.current?.focus();
  }, [booking]);

  function selectType(eventType: EventType) {
    setSelectedType(eventType);
    // Смена типа пересобирает сетку — прежний слот перестаёт быть валидным.
    setSelectedSlot(null);
    setTypeNotice(null);
  }

  function selectDate(next: string) {
    setSelectedDate(next);
    // Другая дата — другая сетка: прежний слот перестаёт быть валидным.
    setSelectedSlot(null);
    setDateTimeNotice(null);
  }

  function selectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setDateTimeNotice(null);
  }

  function changeGuestName(value: string) {
    setGuestName(value);
    // Немедленная подсказка: поле «тронуто», серверная ошибка сбрасывается.
    setTouched((state) => ({ ...state, name: true }));
    setServerErrors((state) => ({ ...state, name: undefined }));
  }

  function changeGuestEmail(value: string) {
    setGuestEmail(value);
    setTouched((state) => ({ ...state, email: true }));
    setServerErrors((state) => ({ ...state, email: undefined }));
  }

  const nameValidation = validateGuestName(guestName);
  const emailValidation = validateGuestEmail(guestEmail);
  const nameError = serverErrors.name ?? (touched.name ? nameValidation.message : undefined);
  const emailError = serverErrors.email ?? (touched.email ? emailValidation.message : undefined);
  const detailsValid = !nameValidation.message && !emailValidation.message;

  const selectedSlotAvailable =
    slotsState.status === "ready" &&
    selectedSlot !== null &&
    slotsState.slots.some((slot) => slot.start === selectedSlot.start && slot.available);
  const canGoNext =
    active === TYPE_STEP
      ? selectedType !== null
      : active === DATE_TIME_STEP
        ? selectedSlotAvailable
        : active === DETAILS_STEP
          ? detailsValid
          : active < STEP_COUNT - 1;

  function goBack() {
    setSubmitState({ status: "idle" });
    setActive((step) => step - 1);
  }

  function goNext() {
    setActive((step) => step + 1);
  }

  function chooseAnotherTime() {
    setSubmitState({ status: "idle" });
    setSelectedSlot(null);
    setActive(DATE_TIME_STEP);
    retrySlots();
  }

  /** Раскладывает ошибку записи по состояниям шага «Подтверждение» (ADR-0015). */
  function applySubmitError(error: BookingError) {
    switch (error.code) {
      case "CONFLICT":
        setSubmitState({ status: "conflict" });
        return;
      case "SERVICE_UNAVAILABLE":
      case "INTERNAL_ERROR":
        setSubmitState({ status: "unavailable" });
        return;
      case "INVALID_SLOT":
      case "DATE_OUT_OF_WINDOW": {
        const outOfWindow = error.code === "DATE_OUT_OF_WINDOW";
        setSubmitState({ status: "idle" });
        setSelectedSlot(null);
        setDateTimeNotice(outOfWindow ? book.stale.date : book.stale.slot);
        setActive(DATE_TIME_STEP);
        retrySlots();
        if (outOfWindow) {
          // Дата вне окна: сбрасываем её на сегодня и обновляем параметры сервиса.
          setSelectedDate(null);
          retryConfig();
        }
        return;
      }
      case "EVENT_TYPE_NOT_FOUND":
        setSubmitState({ status: "idle" });
        setSelectedType(null);
        setSelectedSlot(null);
        setTypeNotice(book.stale.type);
        setActive(TYPE_STEP);
        retryTypes();
        return;
      case "VALIDATION_ERROR": {
        // Сервер — источник истины: сообщения по полям формы показываем под полями
        // (ADR-0015), возвращая гостя на «Ваши данные» с сохранённым вводом. Поля
        // вне формы (`start`, `eventTypeId`) сюда не помещаются — их общий
        // `message` показываем как есть, чтобы не потерять ошибку.
        const fields = error.fields;
        if (fields && (fields.guestName !== undefined || fields.guestEmail !== undefined)) {
          setSubmitState({ status: "idle" });
          setServerErrors({ name: fields.guestName, email: fields.guestEmail });
          setTouched({ name: true, email: true });
          setActive(DETAILS_STEP);
          return;
        }
        break;
      }
      default:
        break;
    }
    // ADR-0015: `message` показывается дословно для `VALIDATION_ERROR` без `fields`
    // и как fallback для необработанных кодов.
    setSubmitState({ status: "message", message: error.message });
  }

  async function submit() {
    if (!selectedType || !selectedSlot) return;

    setSubmitState({ status: "submitting" });
    const result = await createBooking({
      eventTypeId: selectedType.id,
      start: selectedSlot.start,
      guestName: nameValidation.value,
      guestEmail: emailValidation.value,
    });

    if (result.ok) {
      setBooking(result.booking);
      return;
    }
    applySubmitError(result.error);
  }

  if (booking) {
    return (
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Title order={1}>{book.title}</Title>
          <SuccessScreen
            ref={successRef}
            booking={booking}
            durationMinutes={selectedType?.durationMinutes}
            timezone={configState.status === "ready" ? configState.config.timezone : ""}
          />
        </Stack>
      </Container>
    );
  }

  const summaryType = selectedType?.title ?? null;
  const summaryWhen = selectedSlot ? fullDateLabel(instantDate(selectedSlot.start)) : null;
  const summaryTime = selectedSlot
    ? `${instantTime(selectedSlot.start)}–${instantTime(selectedSlot.end)}`
    : null;
  const summaryGuest =
    [nameValidation.value, emailValidation.value].filter(Boolean).join(" · ") || null;

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
                notice={typeNotice}
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
                selectedStart={selectedSlot?.start ?? null}
                onSelectStart={selectSlot}
                slotsState={slotsState}
                onRetrySlots={retrySlots}
                notice={dateTimeNotice}
              />
            </StepPanel>
          </Stepper.Step>
          <Stepper.Step
            label={book.steps.details.label}
            description={book.steps.details.description}
          >
            <StepPanel ref={headingRef} title={book.steps.details.label}>
              <DetailsStep
                name={guestName}
                email={guestEmail}
                nameError={nameError}
                emailError={emailError}
                onChangeName={changeGuestName}
                onChangeEmail={changeGuestEmail}
                onBlurName={() => setTouched((state) => ({ ...state, name: true }))}
                onBlurEmail={() => setTouched((state) => ({ ...state, email: true }))}
              />
            </StepPanel>
          </Stepper.Step>
          <Stepper.Step
            label={book.steps.confirmation.label}
            description={book.steps.confirmation.description}
          >
            <StepPanel ref={headingRef} title={book.steps.confirmation.label}>
              <ConfirmationStep
                typeTitle={summaryType}
                dateLabel={summaryWhen}
                time={summaryTime}
                guest={summaryGuest}
                conflict={submitState.status === "conflict"}
                unavailable={submitState.status === "unavailable"}
                serverMessage={submitState.status === "message" ? submitState.message : null}
                onChooseAnotherTime={chooseAnotherTime}
                onRetry={submit}
              />
            </StepPanel>
          </Stepper.Step>
        </Stepper>
        <Group justify="space-between">
          <Button
            variant="default"
            disabled={active === TYPE_STEP || submitState.status === "submitting"}
            onClick={goBack}
          >
            {book.nav.back}
          </Button>
          {active === CONFIRMATION_STEP ? (
            <Button loading={submitState.status === "submitting"} onClick={submit}>
              {book.confirmationStep.confirm}
            </Button>
          ) : (
            <Button disabled={!canGoNext} onClick={goNext}>
              {book.nav.next}
            </Button>
          )}
        </Group>
      </Stack>
    </Container>
  );
}
