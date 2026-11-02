import { formatInTimeZone } from 'date-fns-tz';

export const AGING_THRESHOLD_DAYS = 90;

const MS_PER_DAY = 86_400_000;

function localCalendarDay(instant: Date, timezone: string): number {
  const [year, month, day] = formatInTimeZone(instant, timezone, 'yyyy-M-d').split('-').map(Number);
  return Date.UTC(year as number, (month as number) - 1, day) / MS_PER_DAY;
}

/**
 * Whole calendar days between stocking and now, counted on the dealership's local calendar.
 * Comparing calendar dates rather than elapsed hours keeps daylight-saving days at one day.
 */
export function getDaysInStock(stockedAt: string | Date, timezone: string, now: Date): number {
  const days = localCalendarDay(now, timezone) - localCalendarDay(new Date(stockedAt), timezone);
  return Math.max(days, 0);
}

export function isAgingStock(daysInStock: number): boolean {
  return daysInStock > AGING_THRESHOLD_DAYS;
}
