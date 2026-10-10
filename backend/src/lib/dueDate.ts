import { istDateOf, todayIst } from './dates';

const DAY_MS = 86_400_000;
const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);

/**
 * A disbursed loan is due `tenureDays` after the Indian calendar date it was disbursed. It becomes overdue
 * the day after the due date. Closed loans keep the date for the record but are never overdue.
 */
export function dueInfo(loan: { status: string; disbursedAt?: Date | null; tenureDays: number }, today: string = todayIst()) {
  if (!loan.disbursedAt) return { dueDate: null, daysToDue: null, overdue: false };
  const start = istDateOf(loan.disbursedAt);
  const dueDate = new Date(Date.parse(`${start}T00:00:00Z`) + loan.tenureDays * DAY_MS).toISOString().slice(0, 10);
  if (loan.status !== 'DISBURSED') return { dueDate, daysToDue: null, overdue: false };
  const daysToDue = daysBetween(today, dueDate);
  return { dueDate, daysToDue, overdue: daysToDue < 0 };
}
