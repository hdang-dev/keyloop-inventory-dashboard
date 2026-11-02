import { formatInTimeZone } from 'date-fns-tz';

export function formatDate(iso: string, timezone: string): string {
  return formatInTimeZone(iso, timezone, 'dd MMM yyyy');
}

export function formatDateTime(iso: string, timezone: string): string {
  return formatInTimeZone(iso, timezone, 'dd MMM yyyy, HH:mm');
}
