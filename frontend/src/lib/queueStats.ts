import type { Loan } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Headline numbers for a work queue. */
export function queueStats(loans: Pick<Loan, 'principal' | 'outstanding' | 'overdue' | 'daysToDue'>[]) {
  return {
    count: loans.length,
    principal: round2(loans.reduce((s, l) => s + l.principal, 0)),
    outstanding: round2(loans.reduce((s, l) => s + l.outstanding, 0)),
    overdue: loans.filter((l) => l.overdue).length,
    dueThisWeek: loans.filter((l) => !l.overdue && l.daysToDue !== null && l.daysToDue <= 7).length,
  };
}
