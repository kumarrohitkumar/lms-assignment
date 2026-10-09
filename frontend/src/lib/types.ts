export type Role = 'ADMIN' | 'SALES' | 'SANCTION' | 'DISBURSEMENT' | 'COLLECTION' | 'BORROWER';
export type EmploymentMode = 'SALARIED' | 'SELF_EMPLOYED' | 'UNEMPLOYED';
export type LoanStatus = 'APPLIED' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
export type BorrowerStage = 'REGISTERED' | 'BRE_FAILED' | 'DETAILS_SUBMITTED' | 'SLIP_UPLOADED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
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
  statusHistory: { from: LoanStatus | null; to: LoanStatus; by: string | null; at: string; note: string | null }[];
  sanctionedAt: string | null;
  disbursedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

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
  createdAt: string;
}
