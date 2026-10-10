import { dueInfo } from '../../lib/dueDate';
import { LOAN_STATUSES, LoanStatus } from '../../lib/loanStatus';
import { toRupees } from '../../lib/money';
import { Role } from '../../lib/roles';
import { Loan, type LoanDocument } from '../../models/Loan';
import { Payment } from '../../models/Payment';
import { User } from '../../models/User';
import { countLeads } from '../sales/sales.service';
import { searchFilter } from './loan.service';

type Actor = { id: string | null; name: string; role: string };
const SYSTEM: Actor = { id: null, name: 'System', role: 'SYSTEM' };

export type TimelineEvent =
  | { type: 'STATUS'; at: Date; from: string | null; to: string; note: string | null; actor: Actor }
  | { type: 'PAYMENT' | 'REVERSAL'; at: Date; utr: string; amount: number; note: string | null; actor: Actor };

// When two events share a timestamp, money movements come before the status change they caused.
const ORDER = { PAYMENT: 0, REVERSAL: 1, STATUS: 2 } as const;

/** Every event in a loan's life, oldest first, with the person (or the system) behind it. */
export async function loanTimeline(loan: LoanDocument) {
  const payments = await Payment.find({ loan: loan._id }).sort({ createdAt: 1 });
  const ids = new Set<string>();
  loan.statusHistory.forEach((h) => h.by && ids.add(String(h.by)));
  payments.forEach((p) => {
    ids.add(String(p.recordedBy));
    if (p.reversal) ids.add(String(p.reversal.by));
  });
  const users = await User.find({ _id: { $in: [...ids] } }, { name: 1, role: 1 }).lean();
  const byId = new Map(users.map((u) => [String(u._id), { id: String(u._id), name: u.name, role: u.role as string }]));
  const actor = (id: unknown): Actor => (id ? (byId.get(String(id)) ?? { id: String(id), name: 'Deleted user', role: 'UNKNOWN' }) : SYSTEM);

  const events: TimelineEvent[] = [
    ...loan.statusHistory.map((h) => ({ type: 'STATUS' as const, at: h.at, from: h.from ?? null, to: h.to, note: h.note ?? null, actor: actor(h.by) })),
    ...payments.map((p) => ({ type: 'PAYMENT' as const, at: p.createdAt!, utr: p.utr, amount: toRupees(p.amount), note: null, actor: actor(p.recordedBy) })),
    ...payments
      .filter((p) => p.reversal)
      .map((p) => ({ type: 'REVERSAL' as const, at: p.reversal!.at, utr: p.utr, amount: toRupees(p.amount), note: p.reversal!.reason, actor: actor(p.reversal!.by) })),
  ];
  events.sort((a, b) => a.at.getTime() - b.at.getTime() || ORDER[a.type] - ORDER[b.type]);
  return { timeline: events, payments };
}

/** Admin history: every loan, newest first, with optional status filter, free-text search and paging. */
export async function listAllLoans(query: { status?: unknown; q?: unknown; page?: unknown; pageSize?: unknown }) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(query.pageSize ?? '20'), 10) || 20));
  const filter: Record<string, unknown> = { ...(await searchFilter(query.q)) };
  if (typeof query.status === 'string' && (LOAN_STATUSES as string[]).includes(query.status)) filter.status = query.status;

  const [loans, total] = await Promise.all([
    Loan.find(filter).populate('borrower', 'name email').sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
    Loan.countDocuments(filter),
  ]);
  return { loans, total, page, pageSize };
}

/** Portfolio summary for the admin overview. */
export async function portfolioOverview() {
  const [statusRows, disbursedRows, collectedRows, outstandingRows, leads, users, active] = await Promise.all([
    Loan.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Loan.aggregate<{ total: number }>([{ $match: { status: { $in: [LoanStatus.DISBURSED, LoanStatus.CLOSED] } } }, { $group: { _id: null, total: { $sum: '$principal' } } }]),
    Payment.aggregate<{ total: number }>([{ $match: { status: { $ne: 'REVERSED' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Loan.aggregate<{ total: number }>([
      { $match: { status: LoanStatus.DISBURSED } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$totalRepayment', '$amountPaid'] } } } },
    ]),
    countLeads(),
    User.countDocuments({ role: Role.BORROWER }),
    Loan.find({ status: LoanStatus.DISBURSED }, { status: 1, disbursedAt: 1, tenureDays: 1, totalRepayment: 1, amountPaid: 1 }).lean(),
  ]);
  const overdue = active.filter((l) => dueInfo(l).overdue);
  const counts = Object.fromEntries(LOAN_STATUSES.map((s) => [s, statusRows.find((r) => r._id === s)?.n ?? 0]));
  return {
    counts,
    leads,
    borrowers: users,
    overdue: { count: overdue.length, outstanding: toRupees(overdue.reduce((sum, l) => sum + l.totalRepayment - l.amountPaid, 0)) },
    money: {
      disbursed: toRupees(disbursedRows[0]?.total ?? 0),
      collected: toRupees(collectedRows[0]?.total ?? 0),
      outstanding: toRupees(outstandingRows[0]?.total ?? 0),
    },
  };
}

