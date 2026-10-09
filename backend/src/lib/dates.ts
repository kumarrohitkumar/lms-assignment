/** Business dates are Indian calendar dates (IST, UTC+5:30), stored as midnight UTC of that date. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const istDateOf = (instant: Date): string => toIsoDate(new Date(instant.getTime() + IST_OFFSET_MS));

export const todayIst = (): string => istDateOf(new Date());
