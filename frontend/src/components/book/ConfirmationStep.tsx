import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";

import { book } from "../../copy/book";

interface ConfirmationStepProps {
  /** Название типа события либо `null`. */
  typeTitle: string | null;
  /** Дата записи словами либо `null`. */
  dateLabel: string | null;
  /** Интервал времени либо `null`. */
  time: string | null;
  /** Имя и email гостя либо `null`. */
  guest: string | null;
  /** Конфликт записи: слот заняли, пока гость заполнял данные (409). */
  conflict: boolean;
  /** Недоступность сервиса при записи (503/500) — данные гостя сохраняются. */
  unavailable: boolean;
  /** Сообщение сервера без полей, показывается как есть (ADR-0015). */
  serverMessage: string | null;
  /** «Выбрать другое время»: возврат к шагу «Дата и время». */
  onChooseAnotherTime: () => void;
  /** «Повторить»: повторная отправка той же брони. */
  onRetry: () => void;
}

/** Строка сводки: подпись слева, значение справа; пустое значение — «—». */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Group>
  );
}

/**
 * Шаг 4 «Подтверждение»: сводка выбранных значений и состояния записи — конфликт
 * (409), недоступность сервиса (503/500) и сообщение сервера без `fields`
 * (ADR-0015, ADR-0011). Кнопку отправки держит навигация мастера.
 */
export function ConfirmationStep({
  typeTitle,
  dateLabel,
  time,
  guest,
  conflict,
  unavailable,
  serverMessage,
  onChooseAnotherTime,
  onRetry,
}: ConfirmationStepProps) {
  const labels = book.confirmationStep.labels;
  const empty = book.confirmationStep.emptyValue;

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Stack gap="xs">
          <SummaryRow label={labels.type} value={typeTitle ?? empty} />
          <SummaryRow label={labels.when} value={dateLabel ?? empty} />
          <SummaryRow label={labels.time} value={time ?? empty} />
          <SummaryRow label={labels.guest} value={guest ?? empty} />
        </Stack>
      </Paper>
      {conflict ? (
        <Alert role="status" color="orange" title={book.conflict.title}>
          <Stack gap="sm" align="flex-start">
            <Text size="sm">{book.conflict.description}</Text>
            <Button variant="light" color="orange" onClick={onChooseAnotherTime}>
              {book.conflict.action}
            </Button>
          </Stack>
        </Alert>
      ) : null}
      {unavailable ? (
        <Alert role="alert" color="red" title={book.submitError.title}>
          <Stack gap="sm" align="flex-start">
            <Text size="sm">{book.submitError.description}</Text>
            <Button variant="light" color="red" onClick={onRetry}>
              {book.submitError.retry}
            </Button>
          </Stack>
        </Alert>
      ) : null}
      {serverMessage ? (
        <Alert role="alert" color="red">
          <Text size="sm">{serverMessage}</Text>
        </Alert>
      ) : null}
    </Stack>
  );
}
