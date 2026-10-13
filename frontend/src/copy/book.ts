import { daysLabel } from "./common";

/**
 * Copy мастера записи `/book` (ADR-0015, ADR-0011). Подписи шагов и навигация —
 * из таблицы шагов спецификации #2; числа длительности и окна записи
 * форматируются здесь.
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
  dateTimeStep: {
    /** Доступное имя полосы дат (role=radiogroup). */
    dateGroupLabel: (days: number) => `Дата, окно записи — ${days} ${daysLabel(days)}`,
    /** Доступное имя сетки слотов с выбранной датой. */
    slotsGroupLabel: (date: string) => `Слоты на ${date}`,
    /** Метка «сегодня» в полосе дат. */
    todayMark: "Сегодня",
    /** Сноска о зоне сервиса; `{timezone}` из `GET /api/config`. */
    timezoneNote: (timezone: string) => `Время указано в зоне сервиса (${timezone}).`,
    emptyTitle: "Нет свободных слотов",
    emptyForDate: (date: string) => `На ${date} всё занято. Выберите другую дату в окне записи.`,
    emptyForToday: "На сегодня свободных слотов не осталось. Выберите другую дату в окне записи.",
    readError: {
      title: "Не удалось загрузить слоты",
      description: "Сервис временно недоступен. Обновите страницу или попробуйте позже.",
      retry: "Повторить",
    },
  },
  /** Длительность типа события бейджем: «15 мин». */
  duration: (minutes: number) => `${minutes} мин`,
  /** Заглушка шагов, которые ещё не реализованы (каркас мастера, #27). */
  stepInProgress: "Шаг в разработке.",
} as const;
