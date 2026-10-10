import { categoryLabel, type DecisionStage } from './decisions';
import { toRupees } from './money';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

interface SlipLike {
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export function serializeSlip(slip: SlipLike | null | undefined) {
  if (!slip) return null;
  return { originalName: slip.originalName, mimeType: slip.mimeType, size: slip.size, uploadedAt: slip.uploadedAt };
}

export function serializeProfile(p: {
  fullName: string;
  pan: string;
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: string;
  bre?: { passed: boolean; failures: { rule?: string | null; message?: string | null }[]; checkedAt: Date } | null;
  salarySlip?: SlipLike | null;
}) {
  return {
    fullName: p.fullName,
    pan: p.pan,
    dateOfBirth: isoDate(p.dateOfBirth),
    monthlySalary: toRupees(p.monthlySalary),
    employmentMode: p.employmentMode,
    bre: p.bre ? { passed: p.bre.passed, failures: p.bre.failures.map((f) => ({ rule: f.rule, message: f.message })), checkedAt: p.bre.checkedAt } : null,
    salarySlip: serializeSlip(p.salarySlip),
  };
}

type PopulatedUser = { _id: unknown; name: string; email: string };

export function serializeLoan(loan: {
  _id: unknown;
  borrower: unknown;
  applicant: { fullName: string; pan: string; dateOfBirth: Date; monthlySalary: number; employmentMode: string };
  salarySlip: SlipLike;
  principal: number;
  tenureDays: number;
  interestRatePa: number;
  simpleInterest: number;
  totalRepayment: number;
  amountPaid: number;
  status: string;
  rejectionReason?: string | null;
  eligibility?: { rule: string; label?: string | null; passed: boolean; detail?: string | null }[];
  rejection?: { stage: string; category: string; note?: string | null; by: unknown; at: Date } | null;
  disbursement?: { reference: string; remark?: string | null; by: unknown; at: Date } | null;
  statusHistory: { from?: string | null; to: string; by?: unknown; at: Date; note?: string | null }[];
  sanctionedAt?: Date | null;
  disbursedAt?: Date | null;
  closedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  const borrower =
    loan.borrower && typeof loan.borrower === 'object' && 'email' in loan.borrower
      ? { id: String((loan.borrower as PopulatedUser)._id), name: (loan.borrower as PopulatedUser).name, email: (loan.borrower as PopulatedUser).email }
      : { id: String(loan.borrower) };

  return {
    id: String(loan._id),
    borrower,
    applicant: {
      fullName: loan.applicant.fullName,
      pan: loan.applicant.pan,
      dateOfBirth: isoDate(loan.applicant.dateOfBirth),
      monthlySalary: toRupees(loan.applicant.monthlySalary),
      employmentMode: loan.applicant.employmentMode,
    },
    salarySlip: serializeSlip(loan.salarySlip),
    principal: toRupees(loan.principal),
    tenureDays: loan.tenureDays,
    interestRatePa: loan.interestRatePa,
    simpleInterest: toRupees(loan.simpleInterest),
    totalRepayment: toRupees(loan.totalRepayment),
    amountPaid: toRupees(loan.amountPaid),
    outstanding: toRupees(loan.totalRepayment - loan.amountPaid),
    status: loan.status,
    rejectionReason: loan.rejectionReason ?? null,
    eligibility: (loan.eligibility ?? []).map((c) => ({ rule: c.rule, label: c.label ?? c.rule, passed: c.passed, detail: c.detail ?? '' })),
    rejection: loan.rejection
      ? {
          stage: loan.rejection.stage,
          category: loan.rejection.category,
          categoryLabel: categoryLabel(loan.rejection.stage as DecisionStage, loan.rejection.category),
          note: loan.rejection.note ?? null,
          by: String(loan.rejection.by),
          at: loan.rejection.at,
        }
      : null,
    disbursement: loan.disbursement
      ? { reference: loan.disbursement.reference, remark: loan.disbursement.remark ?? null, by: String(loan.disbursement.by), at: loan.disbursement.at }
      : null,
    statusHistory: loan.statusHistory.map((h) => ({
      from: h.from ?? null,
      to: h.to,
      by: h.by ? String(h.by) : null,
      at: h.at,
      note: h.note ?? null,
    })),
    sanctionedAt: loan.sanctionedAt ?? null,
    disbursedAt: loan.disbursedAt ?? null,
    closedAt: loan.closedAt ?? null,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
}

export function serializePayment(p: { _id: unknown; loan: unknown; utr: string; amount: number; paymentDate: Date; recordedBy: unknown; createdAt?: Date }) {
  return {
    id: String(p._id),
    loan: String(p.loan),
    utr: p.utr,
    amount: toRupees(p.amount),
    paymentDate: isoDate(p.paymentDate),
    recordedBy: String(p.recordedBy),
    createdAt: p.createdAt,
  };
}
