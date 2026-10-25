import type { DateKey, DayEnd, Weekday } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/** Parses a DateKey as local noon, which keeps day arithmetic clear of DST edges. */
export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86_400_000);
}

export function weekday(key: DateKey): Weekday {
  return ((fromKey(key).getDay() + 6) % 7) as Weekday;
}

/** Monday of the week containing `key`. */
export function weekStart(key: DateKey): DateKey {
  return addDays(key, -weekday(key));
}

/**
 * Minutes after midnight at which the Tendo day closes. Negative values close the day
 * before midnight (11:00 PM = -60). Custom times before noon are read as after midnight.
 */
export function dayEndOffset(dayEnd: DayEnd, custom: string): number {
  switch (dayEnd) {
    case '11:00 PM': return -60;
    case 'Midnight': return 0;
    case '1:00 AM': return 60;
    case '2:00 AM': return 120;
    case '3:00 AM': return 180;
    case 'Custom': {
      const [h, m] = custom.split(':').map(Number);
      const mins = (h || 0) * 60 + (m || 0);
      return h < 12 ? mins : mins - 1440;
    }
  }
}

/** The Tendo day `now` belongs to, given the user's day-end boundary. */
export function tendoDate(now: Date, offsetMinutes: number): DateKey {
  return toKey(new Date(now.getTime() - offsetMinutes * 60_000));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** `Tuesday, 18 March` */
export function longLabel(key: DateKey): string {
  const d = fromKey(key);
  return DAYS[weekday(key)] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
}

/** `18 Mar` */
export function shortLabel(key: DateKey): string {
  const d = fromKey(key);
  return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3);
}

export function weekdayName(key: DateKey): string {
  return DAYS[weekday(key)];
}

/** `19:00` → `7:00 PM` */
export function formatClock(hm: string): string {
  const [hs, ms] = hm.split(':');
  const h = Number(hs);
  return (h % 12 || 12) + ':' + ms + ' ' + (h >= 12 ? 'PM' : 'AM');
}
