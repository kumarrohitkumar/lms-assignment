import type { LoanStatus } from '@/lib/types';

export const STATUS_LABEL: Record<LoanStatus, string> = {
  APPLIED: 'Applied',
  SANCTIONED: 'Sanctioned',
  REJECTED: 'Rejected',
  DISBURSED: 'Disbursed',
  CLOSED: 'Closed',
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  SALES: 'Sales',
  SANCTION: 'Sanction',
  DISBURSEMENT: 'Disbursement',
  COLLECTION: 'Collection',
  BORROWER: 'Borrower',
  SYSTEM: 'Automatic',
  UNKNOWN: 'Unknown',
};

export const STAGE_LABEL = { SANCTION: 'Sanction review', DISBURSEMENT: 'Disbursement' } as const;
