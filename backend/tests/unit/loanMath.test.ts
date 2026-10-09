import { describe, expect, it } from 'vitest';
import { calculateLoan, INTEREST_RATE_PA, LOAN_LIMITS } from '../../src/lib/loanMath';

describe('calculateLoan (simple interest, amounts in paise)', () => {
  it('uses a fixed 12% p.a. rate', () => {
    expect(INTEREST_RATE_PA).toBe(12);
  });

  it('computes one full year on ₹1,00,000 as ₹12,000 interest', () => {
    expect(calculateLoan(100_000_00, 365)).toEqual({ simpleInterest: 12_000_00, totalRepayment: 112_000_00 });
  });

  it('rounds to the nearest paisa: ₹50,000 for 30 days → ₹493.15', () => {
    expect(calculateLoan(50_000_00, 30)).toEqual({ simpleInterest: 493_15, totalRepayment: 50_493_15 });
  });

  it('handles the maximum loan', () => {
    expect(calculateLoan(500_000_00, 365)).toEqual({ simpleInterest: 60_000_00, totalRepayment: 560_000_00 });
  });

  it('exposes the product limits', () => {
    expect(LOAN_LIMITS).toEqual({ minPrincipal: 50_000, maxPrincipal: 500_000, minTenureDays: 30, maxTenureDays: 365 });
  });
});
