import { AppError } from './errors';
import { Role } from './roles';

export const LoanStatus = {
  APPLIED: 'APPLIED',
  SANCTIONED: 'SANCTIONED',
  REJECTED: 'REJECTED',
  DISBURSED: 'DISBURSED',
  CLOSED: 'CLOSED',
} as const;
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];
export const LOAN_STATUSES = Object.values(LoanStatus);

/** A loan in one of these states blocks the borrower from applying again. */
export const OPEN_LOAN_STATUSES: LoanStatus[] = [LoanStatus.APPLIED, LoanStatus.SANCTIONED, LoanStatus.DISBURSED];

export type Actor = Role | 'SYSTEM';

/** The only legal moves through the lifecycle, and who may make each one. */
const TRANSITIONS: { from: LoanStatus; to: LoanStatus; actors: Actor[] }[] = [
  { from: LoanStatus.APPLIED, to: LoanStatus.SANCTIONED, actors: [Role.SANCTION, Role.ADMIN] },
  { from: LoanStatus.APPLIED, to: LoanStatus.REJECTED, actors: [Role.SANCTION, Role.ADMIN] },
  { from: LoanStatus.SANCTIONED, to: LoanStatus.DISBURSED, actors: [Role.DISBURSEMENT, Role.ADMIN] },
  // Disbursement can still stop a sanctioned loan (bank details, KYC, borrower withdrew).
  { from: LoanStatus.SANCTIONED, to: LoanStatus.REJECTED, actors: [Role.DISBURSEMENT, Role.ADMIN] },
  { from: LoanStatus.DISBURSED, to: LoanStatus.CLOSED, actors: ['SYSTEM'] },
];

export function assertTransition(from: LoanStatus, to: LoanStatus, actor: Actor): void {
  const transition = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!transition) {
    throw new AppError(409, 'INVALID_TRANSITION', `Cannot move a loan from ${from} to ${to}`);
  }
  if (!transition.actors.includes(actor)) {
    throw new AppError(403, 'FORBIDDEN', `${actor} cannot move a loan from ${from} to ${to}`);
  }
}
