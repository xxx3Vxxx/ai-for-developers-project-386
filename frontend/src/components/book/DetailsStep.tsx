import { Stack, Text, TextInput } from "@mantine/core";

import { book } from "../../copy/book";

interface DetailsStepProps {
  /** Текущее значение имени. */
  name: string;
  /** Текущее значение email. */
  email: string;
  /** Сообщение об ошибке имени либо `undefined`. */
  nameError?: string;
  /** Сообщение об ошибке email либо `undefined`. */
  emailError?: string;
  /** Изменение имени: включает немедленную подсказку об ошибке. */
  onChangeName: (value: string) => void;
  /** Изменение email: включает немедленную подсказку об ошибке. */
  onChangeEmail: (value: string) => void;
  /** Уход с поля имени: фиксирует «тронутость» для показа ошибки. */
  onBlurName: () => void;
  /** Уход с поля email: фиксирует «тронутость» для показа ошибки. */
  onBlurEmail: () => void;
}

/**
 * Шаг 3 «Ваши данные»: имя и email гостя с немедленной подсказкой об ошибке под
 * полем (ADR-0011). Правила проверки совпадают с бекендом — зеркало
 * `src/validation.ts` (ADR-0015); сам ввод держит мастер.
 */
export function DetailsStep({
  name,
  email,
  nameError,
  emailError,
  onChangeName,
  onChangeEmail,
  onBlurName,
  onBlurEmail,
}: DetailsStepProps) {
  return (
    <Stack gap="md" maw={420}>
      <TextInput
        label={book.detailsStep.nameLabel}
        placeholder={book.detailsStep.namePlaceholder}
        withAsterisk
        value={name}
        error={nameError}
        onChange={(event) => onChangeName(event.currentTarget.value)}
        onBlur={onBlurName}
      />
      <TextInput
        label={book.detailsStep.emailLabel}
        placeholder={book.detailsStep.emailPlaceholder}
        withAsterisk
        value={email}
        error={emailError}
        onChange={(event) => onChangeEmail(event.currentTarget.value)}
        onBlur={onBlurEmail}
      />
      <Text size="xs" c="dimmed">
        {book.detailsStep.emailNote}
      </Text>
    </Stack>
  );
}
