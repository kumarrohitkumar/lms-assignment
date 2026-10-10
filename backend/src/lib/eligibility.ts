import { ageOn, BRE_LIMITS, evaluateBre, type EmploymentMode } from './bre';
import { todayIstAsDate } from './dates';

export interface EligibilityCheck {
  rule: 'AGE' | 'SALARY' | 'PAN' | 'EMPLOYMENT' | 'SALARY_SLIP';
  label: string;
  passed: boolean;
  detail: string;
}

const EMPLOYMENT_LABEL: Record<EmploymentMode, string> = { SALARIED: 'Salaried', SELF_EMPLOYED: 'Self-employed', UNEMPLOYED: 'Unemployed' };
const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** The checks the system ran, with the values it saw, frozen on the loan as evidence for reviewers and the borrower. */
export function eligibilitySnapshot(
  input: { pan: string; dateOfBirth: Date; monthlySalary: number; employmentMode: EmploymentMode; slipName: string | null },
  today: Date = todayIstAsDate(),
): EligibilityCheck[] {
  const failed = new Set(evaluateBre(input, today).failures.map((f) => f.rule));
  const age = ageOn(input.dateOfBirth, today);
  return [
    { rule: 'AGE', label: 'Age', passed: !failed.has('AGE'), detail: `${age} years (allowed ${BRE_LIMITS.minAge}–${BRE_LIMITS.maxAge})` },
    { rule: 'SALARY', label: 'Monthly salary', passed: !failed.has('SALARY'), detail: `${inr(input.monthlySalary)} a month (minimum ${inr(BRE_LIMITS.minMonthlySalaryPaise)})` },
    { rule: 'PAN', label: 'PAN format', passed: !failed.has('PAN'), detail: failed.has('PAN') ? `${input.pan} is not a valid PAN` : `${input.pan} is a valid PAN` },
    { rule: 'EMPLOYMENT', label: 'Employment', passed: !failed.has('EMPLOYMENT'), detail: EMPLOYMENT_LABEL[input.employmentMode] },
    { rule: 'SALARY_SLIP', label: 'Salary slip', passed: !!input.slipName, detail: input.slipName ? `${input.slipName} uploaded` : 'Not uploaded' },
  ];
}
