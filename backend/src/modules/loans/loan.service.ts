import type { Types } from 'mongoose';
import { type DecisionStage, rejectionSummary } from '../../lib/decisions';
import { conflict, notFound } from '../../lib/errors';
import { type Actor, assertTransition, LoanStatus } from '../../lib/loanStatus';
import { Loan, type LoanDocument } from '../../models/Loan';
import { User } from '../../models/User';

export const BORROWER_FIELDS = 'name email';

export async function findLoanOrThrow(id: string): Promise<LoanDocument> {
  const loan = await Loan.findById(id);
  if (!loan) throw notFound('Loan');
  return loan;
}

/** Work queue for a dashboard module: loans in one status, oldest first. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Free-text filter on applicant name, PAN, or the borrower's name/email. */
export async function searchFilter(q: unknown): Promise<Record<string, unknown>> {
  const text = typeof q === 'string' ? q.trim().slice(0, 100) : '';
  if (!text) return {};
  const re = new RegExp(escapeRegex(text), 'i');
  const users = await User.find({ $or: [{ email: re }, { name: re }] }, { _id: 1 }).limit(200).lean();
  return { $or: [{ 'applicant.fullName': re }, { 'applicant.pan': re }, { borrower: { $in: users.map((u) => u._id) } }] };
}

/** Work queue for a dashboard module: loans in one status, oldest first, optionally filtered by `q`. */
export async function listLoansByStatus(status: LoanStatus, q?: unknown) {
  return Loan.find({ status, ...(await searchFilter(q)) })
    .populate('borrower', BORROWER_FIELDS)
    .sort({ createdAt: 1 });
}

interface TransitionOptions {
  actor: { id: Types.ObjectId | null; role: Actor };
  /** The status this action belongs to; a loan in any other status gets 409 (it isn't at this stage). */
  from?: LoanStatus;
  note?: string;
  set?: Record<string, unknown>;
}

/**
 * Moves a loan to `to` after checking the status machine. The update is conditional on the status we
 * read, so two executives acting at once cannot both succeed (the loser gets 409).
 */
export async function transitionLoan(loanId: string, to: LoanStatus, { actor, note, set = {}, from: expected }: TransitionOptions) {
  const loan = await findLoanOrThrow(loanId);
  const from = loan.status as LoanStatus;
  if (expected && from !== expected) {
    throw conflict(`This loan is ${from.toLowerCase()}, not ${expected.toLowerCase()}`, 'INVALID_TRANSITION');
  }
  assertTransition(from, to, actor.role);

  const updated = await Loan.findOneAndUpdate(
    { _id: loan._id, status: from },
    {
      $set: { status: to, ...set },
      $push: { statusHistory: { from, to, by: actor.id, at: new Date(), note: note ?? null } },
    },
    { returnDocument: 'after' },
  ).populate('borrower', BORROWER_FIELDS);

  if (!updated) throw conflict('The loan was updated by someone else. Refresh and try again.', 'INVALID_TRANSITION');
  return updated;
}

const STAGE_STATUS: Record<DecisionStage, LoanStatus> = { SANCTION: LoanStatus.APPLIED, DISBURSEMENT: LoanStatus.SANCTIONED };

/** Turns a loan down at `stage`, keeping the category, note and decision-maker for the borrower and the audit trail. */
export function rejectLoan(loanId: string, stage: DecisionStage, input: { category: string; note?: string }, actor: TransitionOptions['actor']) {
  const summary = rejectionSummary(stage, input.category, input.note);
  return transitionLoan(loanId, LoanStatus.REJECTED, {
    actor,
    from: STAGE_STATUS[stage],
    note: summary,
    set: {
      rejectionReason: summary,
      rejection: { stage, category: input.category, note: input.note ?? null, by: actor.id, at: new Date() },
    },
  });
}
