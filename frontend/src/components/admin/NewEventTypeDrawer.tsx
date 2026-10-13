import {
  Alert,
  Button,
  Drawer,
  Group,
  NumberInput,
  Stack,
  Text,
  Textarea,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useState } from "react";

import { createEventType, type EventType } from "../../api/event-types";
import { admin } from "../../copy/admin";
import { common } from "../../copy/common";
import { validateDescription, validateDurationMinutes, validateTitle } from "../../validation";

/**
 * Id выдвижной панели (ADR-0016): триггер ссылается на него через
 * `aria-controls`, панель отдаёт тот же id диалогу.
 */
export const NEW_EVENT_TYPE_DRAWER_ID = "new-event-type-drawer";

interface NewEventTypeDrawerProps {
  /** Открыта ли панель; управляется страницей кабинета. */
  opened: boolean;
  /** Максимальная длительность — длина рабочего окна из `GET /api/config` (ADR-0003). */
  maxDurationMinutes: number;
  /** Закрытие панели: крестик, Escape, оверлей или «Отмена»; ввод сбрасывается. */
  onClose: () => void;
  /** Успешное создание: тип уже доступен гостям. */
  onCreated: (eventType: EventType) => void;
}

/** Черновик формы: длительность держим как `number | string`, пока гость печатает. */
interface Draft {
  title: string;
  description: string;
  durationMinutes: number | string;
}

/** Поля, чьё сообщение показывается под полем. */
type FieldName = "title" | "description" | "durationMinutes";

const EMPTY_DRAFT: Draft = { title: "", description: "", durationMinutes: 30 };

/** Состояние отправки формы создания типа. */
type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "unavailable" }
  | { status: "message"; message: string };

/**
 * Выдвижная панель «Новый тип события» (ADR-0012): единственное место ввода типа
 * в кабинете владельца. Валидация зеркалит бекенд до отправки (ADR-0015), а
 * серверные `400` с `fields` показываются под полями, не закрывая панель.
 * `503`/`500` — алерт с «Повторить», ввод сохраняется.
 */
export function NewEventTypeDrawer({
  opened,
  maxDurationMinutes,
  onClose,
  onCreated,
}: NewEventTypeDrawerProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    title: false,
    description: false,
    durationMinutes: false,
  });
  const [serverErrors, setServerErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  // На узких экранах панель занимает всю ширину, на десктопе — `md` (ADR-0016).
  // У `Drawer` нет адаптивного `size`, поэтому ширину переключает Mantine-хук
  // `useMediaQuery` по брейкпоинту `sm` — без собственных `.css` и media queries.
  const theme = useMantineTheme();
  const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);
  const drawerSize = isDesktop ? "md" : "100%";

  const titleValidation = validateTitle(draft.title);
  const descriptionValidation = validateDescription(draft.description);
  // Пустое поле `NumberInput` приходит как `""`; трактуем его как отсутствие
  // значения, чтобы владелец видел «Укажите длительность», а не формат.
  const durationValidation = validateDurationMinutes(
    draft.durationMinutes === "" ? undefined : draft.durationMinutes,
    maxDurationMinutes,
  );

  const titleError = serverErrors.title ?? (touched.title ? titleValidation.message : undefined);
  const descriptionError =
    serverErrors.description ?? (touched.description ? descriptionValidation.message : undefined);
  const durationError =
    serverErrors.durationMinutes ??
    (touched.durationMinutes ? durationValidation.message : undefined);

  /** Сбрасывает ввод и состояние формы — при закрытии и после успеха. */
  function reset() {
    setDraft(EMPTY_DRAFT);
    setTouched({ title: false, description: false, durationMinutes: false });
    setServerErrors({});
    setSubmitState({ status: "idle" });
  }

  function close() {
    reset();
    onClose();
  }

  function changeField(field: FieldName, apply: () => void) {
    apply();
    setTouched((state) => ({ ...state, [field]: true }));
    setServerErrors((state) => ({ ...state, [field]: undefined }));
    setSubmitState({ status: "idle" });
  }

  async function submit() {
    // После попытки отправки показываем зеркальные подсказки у всех полей.
    setTouched({ title: true, description: true, durationMinutes: true });
    if (titleValidation.message || descriptionValidation.message || durationValidation.message) {
      return;
    }

    setSubmitState({ status: "submitting" });
    const result = await createEventType({
      title: titleValidation.value,
      description: descriptionValidation.value,
      durationMinutes: durationValidation.value,
    });

    if (result.ok) {
      reset();
      onCreated(result.eventType);
      return;
    }

    const { code, fields, message } = result.error;
    if (code === "VALIDATION_ERROR" && fields) {
      setServerErrors({
        title: fields.title,
        description: fields.description,
        durationMinutes: fields.durationMinutes,
      });
      setSubmitState({ status: "idle" });
      return;
    }
    if (code === "SERVICE_UNAVAILABLE" || code === "INTERNAL_ERROR") {
      setSubmitState({ status: "unavailable" });
      return;
    }
    // ADR-0015: незнакомый код — `message` как есть, чтобы не потерять ошибку.
    setSubmitState({ status: "message", message });
  }

  return (
    <Drawer
      id={NEW_EVENT_TYPE_DRAWER_ID}
      opened={opened}
      onClose={close}
      position="right"
      size={drawerSize}
      title={admin.create.drawerTitle}
      closeButtonProps={{ "aria-label": common.close }}
    >
      <Stack gap="sm">
        <TextInput
          label={admin.create.titleLabel}
          placeholder={admin.create.titlePlaceholder}
          withAsterisk
          data-autofocus
          value={draft.title}
          error={titleError}
          onChange={(event) =>
            changeField("title", () => setDraft({ ...draft, title: event.currentTarget.value }))
          }
        />
        <Textarea
          label={admin.create.descriptionLabel}
          placeholder={admin.create.descriptionPlaceholder}
          rows={3}
          value={draft.description}
          error={descriptionError}
          onChange={(event) =>
            changeField("description", () =>
              setDraft({ ...draft, description: event.currentTarget.value }),
            )
          }
        />
        <NumberInput
          label={admin.create.durationLabel}
          suffix={admin.create.durationSuffix}
          step={15}
          min={15}
          max={maxDurationMinutes}
          value={draft.durationMinutes}
          error={durationError}
          onChange={(value) =>
            changeField("durationMinutes", () => setDraft({ ...draft, durationMinutes: value }))
          }
        />
        {submitState.status === "unavailable" ? (
          <Alert role="alert" color="red" title={admin.create.error.title}>
            <Stack gap="sm" align="flex-start">
              <Text size="sm">{admin.create.error.description}</Text>
              <Button variant="light" color="red" onClick={submit}>
                {admin.create.error.retry}
              </Button>
            </Stack>
          </Alert>
        ) : null}
        {submitState.status === "message" ? (
          <Alert role="alert" color="red">
            <Text size="sm">{submitState.message}</Text>
          </Alert>
        ) : null}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={close}>
            {admin.create.cancel}
          </Button>
          <Button loading={submitState.status === "submitting"} onClick={submit}>
            {admin.create.submit}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
