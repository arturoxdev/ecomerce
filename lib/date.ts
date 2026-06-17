export function getMinBookableDate(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnlyString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Re-anchors a calendar date that was stored at midnight UTC (see
 * {@link parseDateOnly}) to local midnight, keeping its Y/M/D intact.
 *
 * Rent/availability dates are calendar days, but the DB column is
 * `timestamp` without time zone, so the value round-trips as the instant
 * "midnight UTC of day X". Locale-aware formatters (`Intl`, `date-fns`)
 * render in the runtime's local zone, which shifts that instant back a day
 * in negative-offset zones (e.g. UTC-6 shows the day before). Wrapping the
 * value with this helper before formatting makes them render the intended
 * calendar day regardless of the runtime time zone.
 */
export function toDisplayDate(value: Date | string | number): Date {
  const d = value instanceof Date ? value : new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
