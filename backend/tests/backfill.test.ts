import { describe, expect, it } from 'vitest';
import { Loan } from '../src/models/Loan';
import { backfillEligibility } from '../src/scripts/backfillEligibility';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

describe('backfillEligibility', () => {
  it('adds the eligibility snapshot to loans created before it existed, judged on the application date', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    await Loan.updateOne({ _id: loanId }, { $set: { eligibility: [] } });

    const result = await backfillEligibility();
    expect(result).toEqual({ updated: 1 });

    const loan = await Loan.findById(loanId).lean();
    expect(loan!.eligibility.map((c) => c.rule)).toEqual(['AGE', 'SALARY', 'PAN', 'EMPLOYMENT', 'SALARY_SLIP']);
    expect(loan!.eligibility.every((c) => c.passed)).toBe(true);
  });

  it('leaves loans that already have a snapshot alone and can run twice', async () => {
    await createAppliedLoan(app, loginAs);
    expect(await backfillEligibility()).toEqual({ updated: 0 });
    expect(await backfillEligibility()).toEqual({ updated: 0 });
  });
});
