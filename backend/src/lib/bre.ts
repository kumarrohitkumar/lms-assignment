import { todayIstAsDate } from './dates';

export const EMPLOYMENT_MODES = ['SALARIED', 'SELF_EMPLOYED', 'UNEMPLOYED'] as const;
export type EmploymentMode = (typeof EMPLOYMENT_MODES)[number];

export const BRE_LIMITS = { minAge: 23, maxAge: 50, minMonthlySalaryPaise: 25_000_00 } as const;

/**
 * 5 letters, 4 digits, 1 letter. The 4th letter is the holder type
 * (P individual, C company, H HUF, F firm, A AOP, T trust, B BOI, L local authority, J juridical person, G government).
 */
export const PAN_REGEX = /^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$/;

export const isValidPan = (pan: string): boolean => PAN_REGEX.test(pan);

export interface BreInput {
  pan: string;
  dateOfBirth: Date;
  /** paise */
  monthlySalary: number;
  employmentMode: EmploymentMode;
}

export type BreRule = 'AGE' | 'SALARY' | 'PAN' | 'EMPLOYMENT';
export interface BreFailure {
  rule: BreRule;
  message: string;
}
export interface BreResult {
  passed: boolean;
  failures: BreFailure[];
}

/** Completed years between dob and `today` (UTC calendar dates). */
export function ageOn(dob: Date, today: Date): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < dob.getUTCMonth() ||
    (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Runs every rule and reports all failures, so the applicant can fix everything at once. */
export function evaluateBre(input: BreInput, today: Date = todayIstAsDate()): BreResult {
  const failures: BreFailure[] = [];

  const age = ageOn(input.dateOfBirth, today);
  if (age < BRE_LIMITS.minAge || age > BRE_LIMITS.maxAge) {
    failures.push({
      rule: 'AGE',
      message: `Applicant must be between ${BRE_LIMITS.minAge} and ${BRE_LIMITS.maxAge} years old (current age: ${age}).`,
    });
  }
  if (input.monthlySalary < BRE_LIMITS.minMonthlySalaryPaise) {
    failures.push({ rule: 'SALARY', message: 'Monthly salary must be at least ₹25,000.' });
  }
  if (!isValidPan(input.pan)) {
    failures.push({ rule: 'PAN', message: 'PAN must be in the format ABCPE1234F (5 letters, 4 digits, 1 letter).' });
  }
  if (input.employmentMode === 'UNEMPLOYED') {
    failures.push({ rule: 'EMPLOYMENT', message: 'Unemployed applicants are not eligible for a loan.' });
  }

  return { passed: failures.length === 0, failures };
}
