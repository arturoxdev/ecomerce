/** Pure event-window hour logic. No I/O, no DB. */

/** Matches only whole-hour "HH:00" strings. */
const WHOLE_HOUR = /^([01]\d|2[0-3]):00$/;

/** Returns true if `time` is a valid whole-hour string like "09:00". */
export function isWholeHour(time: string): boolean {
  return WHOLE_HOUR.test(time);
}

/** Extracts the numeric hour (0–23) from a valid "HH:MM" string. */
function parseHour(time: string): number {
  return parseInt(time.slice(0, 2), 10);
}

/**
 * Generates an ordered array of whole-hour strings from `start` to `end`
 * inclusive (e.g. ["09:00", "10:00", "11:00"]).
 *
 * Returns `[]` when:
 * - Either `start` or `end` is null/empty.
 * - Either is not a valid whole-hour string.
 * - The hour of `end` is strictly less than the hour of `start`.
 */
export function generateEventHours(
  start: string | null,
  end: string | null,
): string[] {
  if (!start || !end) return [];
  if (!isWholeHour(start) || !isWholeHour(end)) return [];

  const startHour = parseHour(start);
  const endHour = parseHour(end);

  if (endHour < startHour) return [];

  const hours: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(`${String(h).padStart(2, "0")}:00`);
  }
  return hours;
}

/**
 * Returns true if `time` is a valid whole-hour string whose hour falls within
 * the inclusive range `[start, end]`.
 */
export function isWithinEventWindow(
  time: string,
  start: string,
  end: string,
): boolean {
  if (!isWholeHour(time)) return false;
  const hours = generateEventHours(start, end);
  return hours.includes(time);
}
