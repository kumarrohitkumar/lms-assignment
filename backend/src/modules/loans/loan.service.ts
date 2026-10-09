import type { Types } from 'mongoose';
import { conflict, notFound } from '../../lib/errors';
import { type Actor, assertTransition, type LoanStatus } from '../../lib/loanStatus';
import { Loan, type LoanDocument } from '../../models/Loan';

const BORROWER_FIELDS = 'name email';

export async function findLoanOrThrow(id: string): Promise<LoanDocument> {
  const loan = await Loan.findById(id);
  if (!loan) throw notFound('Loan');
  return loan;
}

/** Work queue for a dashboard module: loans in one status, oldest first. */
export const listLoansByStatus = (status: LoanStatus) =>
  Loan.find({ status }).populate('borrower', BORROWER_FIELDS).sort({ createdAt: 1 });

interface TransitionOptions {
  actor: { id: Types.ObjectId | null; role: Actor };
  note?: string;
  set?: Record<string, unknown>;
}

/**
 * Moves a loan to `to` after checking the status machine. The update is conditional on the status we
 * read, so two executives acting at once cannot both succeed (the loser gets 409).
 */
export async function transitionLoan(loanId: string, to: LoanStatus, { actor, note, set = {} }: TransitionOptions) {
  const loan = await findLoanOrThrow(loanId);
  const from = loan.status as LoanStatus;
  assertTransition(from, to, actor.role);

  const updated = await Loan.findOneAndUpdate(
    { _id: loan._id, status: from },
    {
      $set: { status: to, ...set },
      $push: { statusHistory: { from, to, by: actor.id, at: new Date(), note: note ?? null } },
    },
    { new: true },
  ).populate('borrower', BORROWER_FIELDS);

  if (!updated) throw conflict('The loan was updated by someone else. Refresh and try again.', 'INVALID_TRANSITION');
  return updated;
}
