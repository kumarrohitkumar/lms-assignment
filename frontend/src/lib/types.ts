export type Role = 'ADMIN' | 'SALES' | 'SANCTION' | 'DISBURSEMENT' | 'COLLECTION' | 'BORROWER';
export type EmploymentMode = 'SALARIED' | 'SELF_EMPLOYED' | 'UNEMPLOYED';
export type LoanStatus = 'APPLIED' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
export type BorrowerStage = 'REGISTERED' | 'BRE_FAILED' | 'DETAILS_SUBMITTED' | 'SLIP_UPLOADED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}

export interface BreFailure {
  rule: 'AGE' | 'SALARY' | 'PAN' | 'EMPLOYMENT';
  message: string;
}

export interface SalarySlip {
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Profile {
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  bre: { passed: boolean; failures: BreFailure[]; checkedAt: string } | null;
  salarySlip: SalarySlip | null;
}

export interface ProfileResponse {
  profile: Profile | null;
  stage: BorrowerStage;
}

export interface EligibilityCheck {
  rule: 'AGE' | 'SALARY' | 'PAN' | 'EMPLOYMENT' | 'SALARY_SLIP';
  label: string;
  passed: boolean;
  detail: string;
}

export type DecisionStage = 'SANCTION' | 'DISBURSEMENT';
export type RejectionCategories = Record<DecisionStage, { value: string; label: string }[]>;

export interface Rejection {
  stage: DecisionStage;
  category: string;
  categoryLabel: string;
  note: string | null;
  by: string;
  at: string;
}

export interface Loan {
  id: string;
  borrower: { id: string; name?: string; email?: string };
  applicant: { fullName: string; pan: string; dateOfBirth: string; monthlySalary: number; employmentMode: EmploymentMode };
  salarySlip: SalarySlip;
  principal: number;
  tenureDays: number;
  interestRatePa: number;
  simpleInterest: number;
  totalRepayment: number;
  amountPaid: number;
  outstanding: number;
  status: LoanStatus;
  rejectionReason: string | null;
  eligibility: EligibilityCheck[];
  rejection: Rejection | null;
  disbursement: { reference: string; remark: string | null; by: string; at: string } | null;
  statusHistory: { from: LoanStatus | null; to: LoanStatus; by: string | null; at: string; note: string | null }[];
  sanctionedAt: string | null;
  disbursedAt: string | null;
  closedAt: string | null;
  /** Repayment due date (disbursal date + tenure); null until disbursed. */
  dueDate: string | null;
  /** Days left until the due date, negative when overdue; null unless the loan is active. */
  daysToDue: number | null;
  overdue: boolean;
  createdAt: string;
}

/** What a stage decided about a loan it has finished with. */
export interface Decision {
  outcome: 'APPROVED' | 'DISBURSED' | 'REJECTED';
  at: string;
  by: Actor | null;
  /** Rejection category label, null unless rejected. */
  reason: string | null;
  /** Free-text remark (approval/payout) or rejection note. */
  note: string | null;
  /** Bank transfer reference for a payout. */
  reference: string | null;
}

export type DecidedLoan = Loan & { decision: Decision };

export interface Lead {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  stage: BorrowerStage;
  profile: { fullName: string; monthlySalary: number; employmentMode: EmploymentMode; breFailures: string[] } | null;
}

export interface Payment {
  id: string;
  utr: string;
  amount: number;
  paymentDate: string;
  status: 'RECEIVED' | 'REVERSED';
  reversal: { reason: string; by: string; at: string } | null;
  createdAt: string;
}

export interface Actor {
  id: string | null;
  name: string;
  role: Role | 'SYSTEM' | 'UNKNOWN';
}

export type TimelineEvent =
  | { type: 'STATUS'; at: string; from: LoanStatus | null; to: LoanStatus; note: string | null; actor: Actor }
  | { type: 'PAYMENT' | 'REVERSAL'; at: string; utr: string; amount: number; note: string | null; actor: Actor };

export interface LoanDetail {
  loan: Loan;
  timeline: TimelineEvent[];
  payments: Payment[];
}

export interface Overview {
  counts: Record<LoanStatus, number>;
  leads: number;
  borrowers: number;
  overdue: { count: number; outstanding: number };
  money: { disbursed: number; collected: number; outstanding: number };
}
