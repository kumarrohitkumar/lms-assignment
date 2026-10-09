import { describe, expect, it } from 'vitest';
import { calculateLoan, LOAN_LIMITS } from '@/lib/loanMath';

describe('calculateLoan (client preview, rupees)', () => {
  it('matches the server for one year on ₹1,00,000', () => {
    expect(calculateLoan(100000, 365)).toEqual({ principal: 100000, simpleInterest: 12000, totalRepayment: 112000 });
  });

  it('rounds to the paisa like the server: ₹50,000 × 30 days', () => {
    expect(calculateLoan(50000, 30)).toEqual({ principal: 50000, simpleInterest: 493.15, totalRepayment: 50493.15 });
  });

  it('matches the server for ₹2,00,000 × 180 days', () => {
    expect(calculateLoan(200000, 180).totalRepayment).toBe(211835.62);
  });

  it('exposes the slider limits', () => {
    expect(LOAN_LIMITS).toMatchObject({ minPrincipal: 50000, maxPrincipal: 500000, minTenureDays: 30, maxTenureDays: 365 });
  });
});
