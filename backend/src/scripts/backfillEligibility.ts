import type { EmploymentMode } from '../lib/bre';
import { eligibilitySnapshot } from '../lib/eligibility';
import { Loan } from '../models/Loan';

/**
 * Loans created before eligibility snapshots existed get one, rebuilt from the applicant details frozen on
 * the loan and judged as of the application date. Safe to run repeatedly.
 */
export async function backfillEligibility() {
  const loans = await Loan.find({ $or: [{ eligibility: { $exists: false } }, { eligibility: { $size: 0 } }] });
  for (const loan of loans) {
    const appliedOn = new Date(`${new Date(loan.createdAt!.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)}T00:00:00Z`);
    const checks = eligibilitySnapshot(
      {
        pan: loan.applicant.pan,
        dateOfBirth: loan.applicant.dateOfBirth,
        monthlySalary: loan.applicant.monthlySalary,
        employmentMode: loan.applicant.employmentMode as EmploymentMode,
        slipName: loan.salarySlip?.originalName ?? null,
      },
      appliedOn,
    );
    await Loan.updateOne({ _id: loan._id }, { $set: { eligibility: checks } });
  }
  return { updated: loans.length };
}
