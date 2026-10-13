import type { ServiceConfig } from "../api/config";

/** Склонение слова «день» по числу: 1 день, 2 дня, 5 дней. */
function daysLabel(days: number): string {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

/**
 * Copy лендинга `/` (ADR-0015). Числа окна записи и часы рабочего окна в тексте
 * подставляются из `GET /api/config`, а не хардкодятся.
 */
export const landing = {
  badge: "БЫСТРАЯ ЗАПИСЬ НА ЗВОНОК",
  title: "Календарь звонков",
  subtitle:
    "Выберите тип события, откройте календарь и забронируйте свободный слот. Быстрая бронь без лишних шагов.",
  cta: "Записаться →",
  capabilitiesTitle: "Что доступно прямо сейчас",
  capabilities: {
    window: (config: ServiceConfig) =>
      `Свободные слоты на ${config.bookingWindowDays} ${daysLabel(config.bookingWindowDays)} вперёд, ежедневно с ${config.workingWindow.start} до ${config.workingWindow.end}.`,
    types: "Типы событий с собственной длительностью.",
    exclusive: "Проверка занятости: на одно время — одна бронь.",
  },
} as const;
