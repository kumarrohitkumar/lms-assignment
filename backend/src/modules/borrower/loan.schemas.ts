import { z } from 'zod';
import { LOAN_LIMITS } from '../../lib/loanMath';
import { hasAtMostTwoDecimals } from '../../lib/money';

/** Only principal and tenure are accepted; interest and totals are always computed on the server. */
export const applyLoanSchema = z.object({
  principal: z
    .number({ error: 'Loan amount is required' })
    .min(LOAN_LIMITS.minPrincipal, 'Loan amount must be at least ₹50,000')
    .max(LOAN_LIMITS.maxPrincipal, 'Loan amount cannot exceed ₹5,00,000')
    .refine(hasAtMostTwoDecimals, 'At most 2 decimal places'),
  tenureDays: z
    .number({ error: 'Tenure is required' })
    .int('Tenure must be a whole number of days')
    .min(LOAN_LIMITS.minTenureDays, 'Tenure must be at least 30 days')
    .max(LOAN_LIMITS.maxTenureDays, 'Tenure cannot exceed 365 days'),
});

export type ApplyLoanInput = z.infer<typeof applyLoanSchema>;
