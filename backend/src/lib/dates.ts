/** Business dates are Indian calendar dates (IST, UTC+5:30), stored as midnight UTC of that date. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const istDateOf = (instant: Date): string => toIsoDate(new Date(instant.getTime() + IST_OFFSET_MS));

export const todayIst = (): string => istDateOf(new Date());

/** Today's IST calendar date as midnight UTC, the same representation used for stored dates. */
export const todayIstAsDate = (): Date => new Date(`${todayIst()}T00:00:00Z`);

/** True only for real calendar dates in YYYY-MM-DD form (rejects 2026-02-30 instead of rolling it over). */
export function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value;
}
