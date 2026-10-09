import type { Types } from 'mongoose';
import { conflict } from '../../lib/errors';
import { calculateLoan, INTEREST_RATE_PA } from '../../lib/loanMath';
import { LoanStatus, OPEN_LOAN_STATUSES } from '../../lib/loanStatus';
import { toPaise } from '../../lib/money';
import { BorrowerProfile } from '../../models/BorrowerProfile';
import { Loan } from '../../models/Loan';
import type { ApplyLoanInput } from './loan.schemas';

const openLoanExists = () =>
  conflict('You already have a loan in progress. You can apply again once it is closed or rejected.', 'OPEN_LOAN_EXISTS');

export async function assertNoOpenLoan(borrowerId: Types.ObjectId) {
  if (await Loan.exists({ borrower: borrowerId, status: { $in: OPEN_LOAN_STATUSES } })) throw openLoanExists();
}

export async function applyForLoan(borrowerId: Types.ObjectId, input: ApplyLoanInput) {
  const profile = await BorrowerProfile.findOne({ user: borrowerId });
  if (!profile?.bre?.passed) {
    throw conflict('Complete your personal details and pass the eligibility check first', 'BRE_NOT_PASSED');
  }
  if (!profile.salarySlip) throw conflict('Upload your salary slip before applying', 'SALARY_SLIP_REQUIRED');
  await assertNoOpenLoan(borrowerId);

  const principal = toPaise(input.principal);
  const { simpleInterest, totalRepayment } = calculateLoan(principal, input.tenureDays);

  try {
    return await Loan.create({
      borrower: borrowerId,
      applicant: {
        fullName: profile.fullName,
        pan: profile.pan,
        dateOfBirth: profile.dateOfBirth,
        monthlySalary: profile.monthlySalary,
        employmentMode: profile.employmentMode,
      },
      salarySlip: profile.salarySlip,
      principal,
      tenureDays: input.tenureDays,
      interestRatePa: INTEREST_RATE_PA,
      simpleInterest,
      totalRepayment,
      status: LoanStatus.APPLIED,
      statusHistory: [{ from: null, to: LoanStatus.APPLIED, by: borrowerId, at: new Date() }],
    });
  } catch (err) {
    // Lost a race with a concurrent application: the partial unique index caught it.
    if ((err as { code?: number }).code === 11000) throw openLoanExists();
    throw err;
  }
}

export const listBorrowerLoans = (borrowerId: Types.ObjectId) => Loan.find({ borrower: borrowerId }).sort({ createdAt: -1 });
