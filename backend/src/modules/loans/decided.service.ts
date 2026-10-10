import { categoryLabel, type DecisionStage } from '../../lib/decisions';
import { LoanStatus } from '../../lib/loanStatus';
import { serializeLoan } from '../../lib/serializers';
import { Loan } from '../../models/Loan';
import { User } from '../../models/User';
import { BORROWER_FIELDS, searchFilter } from './loan.service';

/** The status a loan sits in while it waits for each stage. */
const QUEUE_STATUS: Record<DecisionStage, LoanStatus> = { SANCTION: LoanStatus.APPLIED, DISBURSEMENT: LoanStatus.SANCTIONED };
const POSITIVE: Record<DecisionStage, 'APPROVED' | 'DISBURSED'> = { SANCTION: 'APPROVED', DISBURSEMENT: 'DISBURSED' };

const LIMIT = 100;

/**
 * Loans this stage has already acted on, newest decision first: the outcome, who decided, when,
 * and the reason (rejections) or remark and bank reference (approvals and payouts).
 */
export async function listStageDecisions(stage: DecisionStage, q?: unknown) {
  const from = QUEUE_STATUS[stage];
  const loans = await Loan.find({ 'statusHistory.from': from, ...(await searchFilter(q)) })
    .populate('borrower', BORROWER_FIELDS)
    .sort({ updatedAt: -1 })
    .limit(LIMIT);

  const decided = loans.flatMap((loan) => {
    const entry = [...loan.statusHistory].reverse().find((h) => h.from === from);
    return entry ? [{ loan, entry }] : [];
  });

  const users = await User.find({ _id: { $in: decided.map((d) => d.entry.by).filter(Boolean) } }, { name: 1, role: 1 }).lean();
  const byId = new Map(users.map((u) => [String(u._id), { id: String(u._id), name: u.name, role: u.role as string }]));

  const rows = decided.map(({ loan, entry }) => {
    const rejected = entry.to === LoanStatus.REJECTED;
    const rejection = rejected && loan.rejection?.stage === stage ? loan.rejection : null;
    const payout = !rejected && stage === 'DISBURSEMENT' ? loan.disbursement : null;
    const by = entry.by ? (byId.get(String(entry.by)) ?? { id: String(entry.by), name: 'Deleted user', role: 'UNKNOWN' }) : null;
    return {
      ...serializeLoan(loan),
      decision: {
        outcome: rejected ? 'REJECTED' : POSITIVE[stage],
        at: entry.at,
        by,
        reason: rejection ? categoryLabel(stage, rejection.category) : rejected ? (loan.rejectionReason ?? null) : null,
        note: rejection ? (rejection.note ?? null) : payout ? (payout.remark ?? null) : rejected ? null : (entry.note ?? null),
        reference: payout?.reference ?? null,
      },
    };
  });
  rows.sort((a, b) => new Date(b.decision.at).getTime() - new Date(a.decision.at).getTime());

  const rejectedCount = rows.filter((r) => r.decision.outcome === 'REJECTED').length;
  return { loans: rows, counts: { approved: rows.length - rejectedCount, rejected: rejectedCount } };
}
