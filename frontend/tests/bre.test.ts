import { describe, expect, it, vi } from 'vitest';
import { checkEligibility } from '@/lib/bre';

const today = new Date('2026-10-09T00:00:00Z');
const ok = { pan: 'ABCPE1234F', dateOfBirth: '1995-05-20', monthlySalary: 60000, employmentMode: 'SALARIED' as const };

describe('client-side eligibility preview', () => {
  it('passes a valid applicant', () => {
    expect(checkEligibility(ok, today)).toEqual([]);
  });

  it('accepts lowercase PAN (it is uppercased before checking)', () => {
    expect(checkEligibility({ ...ok, pan: 'abcpe1234f' }, today)).toEqual([]);
  });

  it('lists every failing rule', () => {
    const rules = checkEligibility(
      { pan: 'ABCDE1234F', dateOfBirth: '2005-01-01', monthlySalary: 24999, employmentMode: 'UNEMPLOYED' },
      today,
    ).map((f) => f.rule);
    expect(rules).toEqual(['AGE', 'SALARY', 'PAN', 'EMPLOYMENT']);
  });

  it('uses inclusive age bounds 23–50', () => {
    expect(checkEligibility({ ...ok, dateOfBirth: '2003-10-09' }, today)).toEqual([]);
    expect(checkEligibility({ ...ok, dateOfBirth: '1975-10-10' }, today)).toEqual([]);
    expect(checkEligibility({ ...ok, dateOfBirth: '1975-10-09' }, today).map((f) => f.rule)).toEqual(['AGE']);
  });
});

describe('uses the Indian calendar date by default', () => {
  it('treats 01:30 IST on the 23rd birthday as 23', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T20:00:00Z'));
    expect(checkEligibility({ ...ok, dateOfBirth: '2003-10-10' })).toEqual([]);
    vi.useRealTimers();
  });
});
