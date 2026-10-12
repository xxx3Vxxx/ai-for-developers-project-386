// PROTOTYPE — throwaway. Prototype state vocabulary for the /admin exploration (issue #12).
// Delete this whole folder once a variant is chosen.

export const PROTOTYPE_STATES = [
  "normal",
  "loading",
  "empty",
  "error",
  "invalid",
  "success",
] as const;

export type PrototypeState = (typeof PROTOTYPE_STATES)[number];

export const STATE_LABELS: Record<PrototypeState, string> = {
  normal: "Норма",
  loading: "Загрузка",
  empty: "Нет встреч",
  error: "Ошибка",
  invalid: "Ошибки формы",
  success: "Успех",
};

export function isPrototypeState(value: string): value is PrototypeState {
  return (PROTOTYPE_STATES as readonly string[]).includes(value);
}
