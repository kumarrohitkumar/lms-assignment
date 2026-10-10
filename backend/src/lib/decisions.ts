/** Why a loan can be turned down at each stage. Labels are what the borrower sees. */
export const REJECTION_CATEGORIES = {
  SANCTION: [
    { value: 'INCOME_MISMATCH', label: "Income on the salary slip doesn't match the declared salary" },
    { value: 'SLIP_UNREADABLE', label: 'Salary slip is unclear or unreadable' },
    { value: 'DOCUMENT_INVALID', label: 'Salary slip looks altered or is not a valid document' },
    { value: 'EMPLOYMENT_UNVERIFIED', label: 'Employment could not be verified' },
    { value: 'HIGH_RISK', label: 'Repayment risk is too high for this amount' },
    { value: 'OTHER', label: 'Other' },
  ],
  DISBURSEMENT: [
    { value: 'BANK_DETAILS', label: 'Bank account could not be verified' },
    { value: 'KYC', label: 'KYC verification failed' },
    { value: 'BORROWER_WITHDREW', label: 'Borrower withdrew the request' },
    { value: 'OTHER', label: 'Other' },
  ],
} as const;

export type DecisionStage = keyof typeof REJECTION_CATEGORIES;

export function categoryLabel(stage: DecisionStage, value: string): string {
  return REJECTION_CATEGORIES[stage].find((c) => c.value === value)?.label ?? value;
}

/** One-line reason kept on the loan for simple displays: "<label> — <note>". */
export function rejectionSummary(stage: DecisionStage, category: string, note?: string | null): string {
  const label = category === 'OTHER' && note ? '' : categoryLabel(stage, category);
  return [label, note].filter(Boolean).join(' — ');
}
