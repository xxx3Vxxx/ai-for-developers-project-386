/**
 * Copy мастера записи `/book` (ADR-0015, ADR-0011). Подписи шагов и навигация —
 * из таблицы шагов спецификации #2; числа длительности форматируются здесь.
 */
export const book = {
  title: "Запись на звонок",
  steps: {
    type: { label: "Тип", description: "Что за встреча" },
    dateTime: { label: "Дата и время", description: "Свободный слот" },
    details: { label: "Ваши данные", description: "Имя и email" },
    confirmation: { label: "Подтверждение", description: "Проверьте детали" },
  },
  nav: {
    back: "Назад",
    next: "Далее",
  },
  typeStep: {
    /** Доступное имя группы выбора типа (role=radiogroup). */
    groupLabel: "Тип события",
  },
  /** Длительность типа события бейджем: «15 мин». */
  duration: (minutes: number) => `${minutes} мин`,
  /** Заглушка шагов, которые ещё не реализованы (каркас мастера, #27). */
  stepInProgress: "Шаг в разработке.",
} as const;
