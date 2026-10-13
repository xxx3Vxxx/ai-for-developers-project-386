/**
 * Общий copy: бренд шапки и тексты асинхронных состояний чтения (ADR-0015).
 * Тексты ошибок API принадлежат бекенду; здесь — только статичный интерфейс.
 */
export const common = {
  brand: "Календарь звонков",
  book: "Записаться",
  loading: "Загрузка…",
  readError: {
    title: "Не удалось загрузить данные",
    description: "Повторите попытку позже.",
    retry: "Повторить",
  },
} as const;

/** Склонение слова «день» по числу: 1 день, 2 дня, 5 дней. */
export function daysLabel(days: number): string {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}
