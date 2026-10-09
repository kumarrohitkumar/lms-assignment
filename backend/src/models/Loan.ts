import { type HydratedDocument, type InferSchemaType, model, Schema } from 'mongoose';
import { EMPLOYMENT_MODES } from '../lib/bre';
import { LOAN_STATUSES, LoanStatus, OPEN_LOAN_STATUSES } from '../lib/loanStatus';
import { salarySlipSchema } from './BorrowerProfile';

const statusChangeSchema = new Schema(
  {
    from: { type: String, enum: [...LOAN_STATUSES, null], default: null },
    to: { type: String, enum: LOAN_STATUSES, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true },
    note: { type: String, default: null },
  },
  { _id: false },
);

/** Snapshot of the details the decision was based on; later profile edits do not change it. */
const applicantSchema = new Schema(
  {
    fullName: { type: String, required: true },
    pan: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalary: { type: Number, required: true },
    employmentMode: { type: String, enum: EMPLOYMENT_MODES, required: true },
  },
  { _id: false },
);

/** All money fields are integer paise. Outstanding = totalRepayment − amountPaid (derived, not stored). */
const loanSchema = new Schema(
  {
    borrower: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicant: { type: applicantSchema, required: true },
    salarySlip: { type: salarySlipSchema, required: true },
    principal: { type: Number, required: true, min: 0 },
    tenureDays: { type: Number, required: true, min: 1 },
    interestRatePa: { type: Number, required: true },
    simpleInterest: { type: Number, required: true, min: 0 },
    totalRepayment: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: LOAN_STATUSES, required: true, default: LoanStatus.APPLIED, index: true },
    rejectionReason: { type: String, default: null },
    statusHistory: { type: [statusChangeSchema], default: [] },
    sanctionedAt: { type: Date, default: null },
    disbursedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Database-level guarantee of "one open loan per borrower", even under concurrent requests.
loanSchema.index(
  { borrower: 1 },
  { unique: true, name: 'one_open_loan_per_borrower', partialFilterExpression: { status: { $in: OPEN_LOAN_STATUSES } } },
);

export type LoanDoc = InferSchemaType<typeof loanSchema>;
export type LoanDocument = HydratedDocument<LoanDoc>;
export const Loan = model('Loan', loanSchema);
