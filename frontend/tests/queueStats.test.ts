import { describe, expect, it } from 'vitest';
import { queueStats } from '@/lib/queueStats';
import type { Loan } from '@/lib/types';

const loan = (o: Partial<Loan>) => ({ principal: 100000, totalRepayment: 103000, outstanding: 103000, overdue: false, daysToDue: 30, ...o }) as Loan;

describe('queueStats', () => {
  it('counts loans and sums what was asked for and what is still due', () => {
    const s = queueStats([loan({ principal: 100000, outstanding: 50000 }), loan({ principal: 250000, outstanding: 260000 })]);
    expect(s).toEqual({ count: 2, principal: 350000, outstanding: 310000, overdue: 0, dueThisWeek: 0 });
  });

  it('counts overdue loans and loans due within 7 days', () => {
    const s = queueStats([loan({ overdue: true, daysToDue: -3 }), loan({ daysToDue: 0 }), loan({ daysToDue: 7 }), loan({ daysToDue: 8 })]);
    expect(s.overdue).toBe(1);
    expect(s.dueThisWeek).toBe(2);
  });

  it('handles an empty queue', () => {
    expect(queueStats([])).toEqual({ count: 0, principal: 0, outstanding: 0, overdue: 0, dueThisWeek: 0 });
  });
});
