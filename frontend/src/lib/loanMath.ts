/** Mirrors backend/src/lib/loanMath.ts for the live preview. The server recomputes on apply. */
export const INTEREST_RATE_PA = 12;

export const LOAN_LIMITS = {
  minPrincipal: 50_000,
  maxPrincipal: 500_000,
  principalStep: 1_000,
  minTenureDays: 30,
  maxTenureDays: 365,
} as const;

/** SI = (P × R × T) / (365 × 100), worked in paise so it rounds exactly like the server. */
export function calculateLoan(principal: number, tenureDays: number) {
  const principalPaise = Math.round(principal * 100);
  const interestPaise = Math.round((principalPaise * INTEREST_RATE_PA * tenureDays) / (365 * 100));
  return {
    principal,
    simpleInterest: interestPaise / 100,
    totalRepayment: (principalPaise + interestPaise) / 100,
  };
}
