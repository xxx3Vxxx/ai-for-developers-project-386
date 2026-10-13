import { addDays, dateLabel } from "../format/date";

/** Длительность в минутах словами: «15 мин», «1 ч», «1 ч 30 мин». */
function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

/**
 * Заголовок суток в ленте встреч: «Сегодня», «Завтра» или «12 октября»
 * (ADR-0012). Сравнение — с сегодняшней датой зоны сервиса из `GET /api/config`.
 */
function dayHeading(date: string, today: string): string {
  if (date === today) return "Сегодня";
  if (date === addDays(today, 1)) return "Завтра";
  return dateLabel(date);
}

/**
 * Copy кабинета владельца `/admin` (ADR-0012, ADR-0015): рельс типов и лента
 * предстоящих встреч. Текстами владеет фронтенд; ошибки приходят с бекенда.
 */
export const admin = {
  title: "Типы событий и предстоящие встречи",
  types: {
    /** Видимый заголовок рельса типов (только просмотр). */
    heading: "Типы событий",
  },
  meetings: {
    /** Видимый заголовок ленты встреч. */
    heading: "Предстоящие встречи",
    /** Метка дня, совпадающего с сегодняшней датой зоны сервиса. */
    todayMark: "сегодня",
    /** Маркер встречи, идущей прямо сейчас. */
    ongoing: "идёт сейчас",
    empty: {
      title: "Пока нет предстоящих встреч",
      description: "Список заполнится, как только гости запишутся на слоты.",
    },
  },
  duration,
  dayHeading,
} as const;
