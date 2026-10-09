export const INTEREST_RATE_PA = 12;

/** Product limits in rupees / days (as shown to users). */
export const LOAN_LIMITS = {
  minPrincipal: 50_000,
  maxPrincipal: 500_000,
  minTenureDays: 30,
  maxTenureDays: 365,
} as const;

/**
 * Simple interest: SI = (P × R × T) / (365 × 100), T in days.
 * Takes and returns paise; SI is rounded to the nearest paisa.
 */
export function calculateLoan(principalPaise: number, tenureDays: number) {
  const simpleInterest = Math.round((principalPaise * INTEREST_RATE_PA * tenureDays) / (365 * 100));
  return { simpleInterest, totalRepayment: principalPaise + simpleInterest };
}
