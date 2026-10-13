import type { components } from "contracts";

import type { Config } from "./config.js";
import type { Db } from "./db.js";
import { hhmmToMinutes, toZonedIso, zonedWallClockToInstant } from "./time.js";

type Slot = components["schemas"]["Slot"];

const MINUTE = 60_000;

interface BookingRow {
  start: number;
  end: number;
}

export interface DaySlotsOptions {
  db: Db;
  config: Config;
  /** Длительность типа события в минутах — шаг сетки. */
  durationMinutes: number;
  /** Локальные сутки зоны сервиса (YYYY-MM-DD). */
  date: string;
  /** Момент запроса; нужен для `start > now` сегодня. */
  now: Date;
  /** Сегодняшняя дата зоны сервиса (YYYY-MM-DD). */
  today: string;
}

/**
 * Полная сетка дня для типа события (ADR-0002, ADR-0003): начала выровнены от
 * начала рабочего окна с шагом в длительность типа, в сетку попадают только
 * слоты, целиком укладывающиеся до конца окна. `available` = нет пересечения с
 * бронью (независимо от типа), а для сегодняшнего дня — ещё и начало в будущем
 * (ADR-0009).
 */
export function buildDaySlots({
  db,
  config,
  durationMinutes,
  date,
  now,
  today,
}: DaySlotsOptions): Slot[] {
  const timeZone = config.serviceTimezone;
  const windowStart = hhmmToMinutes(config.workDayStart);
  const windowEnd = hhmmToMinutes(config.workDayEnd);

  // Все брони, способные пересечь сетку дня: их интервалы задевают рабочее окно.
  const bookings = db
    .prepare(`SELECT start, end FROM bookings WHERE end > @from AND start < @to`)
    .all({
      from: zonedWallClockToInstant(timeZone, date, windowStart).getTime(),
      to: zonedWallClockToInstant(timeZone, date, windowEnd).getTime(),
    }) as BookingRow[];

  const slots: Slot[] = [];
  for (let start = windowStart; start + durationMinutes <= windowEnd; start += durationMinutes) {
    const startInstant = zonedWallClockToInstant(timeZone, date, start);
    const endInstant = startInstant.getTime() + durationMinutes * MINUTE;
    const overlaps = bookings.some(
      (booking) => booking.start < endInstant && booking.end > startInstant.getTime(),
    );
    const inFuture = date !== today || startInstant.getTime() > now.getTime();

    slots.push({
      start: toZonedIso(timeZone, startInstant),
      end: toZonedIso(timeZone, new Date(endInstant)),
      available: !overlaps && inFuture,
    });
  }

  return slots;
}
