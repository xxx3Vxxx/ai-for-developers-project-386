import type { ServiceConfig } from "../api/config";
import { daysLabel } from "./common";

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
