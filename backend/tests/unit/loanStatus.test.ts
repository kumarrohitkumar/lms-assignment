import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/lib/errors';
import { assertTransition, LoanStatus } from '../../src/lib/loanStatus';
import { Role } from '../../src/lib/roles';

function errorOf(fn: () => void): AppError {
  try {
    fn();
  } catch (e) {
    return e as AppError;
  }
  throw new Error('expected an error');
}

describe('loan status machine', () => {
  it.each([
    [LoanStatus.APPLIED, LoanStatus.SANCTIONED, Role.SANCTION],
    [LoanStatus.APPLIED, LoanStatus.REJECTED, Role.SANCTION],
    [LoanStatus.APPLIED, LoanStatus.SANCTIONED, Role.ADMIN],
    [LoanStatus.SANCTIONED, LoanStatus.DISBURSED, Role.DISBURSEMENT],
    [LoanStatus.SANCTIONED, LoanStatus.DISBURSED, Role.ADMIN],
    [LoanStatus.DISBURSED, LoanStatus.CLOSED, 'SYSTEM'],
  ] as const)('allows %s → %s by %s', (from, to, actor) => {
    expect(() => assertTransition(from, to, actor)).not.toThrow();
  });

  it.each([
    [LoanStatus.APPLIED, LoanStatus.DISBURSED],
    [LoanStatus.SANCTIONED, LoanStatus.SANCTIONED],
    [LoanStatus.REJECTED, LoanStatus.SANCTIONED],
    [LoanStatus.CLOSED, LoanStatus.DISBURSED],
    [LoanStatus.DISBURSED, LoanStatus.SANCTIONED],
  ] as const)('rejects %s → %s with 409', (from, to) => {
    const err = errorOf(() => assertTransition(from, to, Role.ADMIN));
    expect(err.status).toBe(409);
    expect(err.code).toBe('INVALID_TRANSITION');
  });

  it('rejects a valid transition by the wrong actor with 403', () => {
    expect(errorOf(() => assertTransition(LoanStatus.APPLIED, LoanStatus.SANCTIONED, Role.DISBURSEMENT)).status).toBe(403);
    expect(errorOf(() => assertTransition(LoanStatus.DISBURSED, LoanStatus.CLOSED, Role.COLLECTION)).status).toBe(403);
  });
});
