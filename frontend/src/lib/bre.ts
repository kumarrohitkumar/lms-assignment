import type { BreFailure, EmploymentMode } from './types';

/**
 * Instant feedback only. The server runs the same rules and is the source of truth,
 * because anything in the browser can be bypassed.
 */
export const PAN_REGEX = /^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$/;

interface EligibilityInput {
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: EmploymentMode;
}

function ageOn(dob: Date, today: Date) {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function checkEligibility(input: EligibilityInput, today = new Date()): BreFailure[] {
  const failures: BreFailure[] = [];
  const dob = new Date(`${input.dateOfBirth}T00:00:00Z`);
  const age = ageOn(dob, today);
  if (Number.isNaN(age) || age < 23 || age > 50) {
    failures.push({ rule: 'AGE', message: 'You must be between 23 and 50 years old.' });
  }
  if (!(input.monthlySalary >= 25_000)) {
    failures.push({ rule: 'SALARY', message: 'Monthly salary must be at least ₹25,000.' });
  }
  if (!PAN_REGEX.test(input.pan.trim().toUpperCase())) {
    failures.push({ rule: 'PAN', message: 'PAN must look like ABCPE1234F.' });
  }
  if (input.employmentMode === 'UNEMPLOYED') {
    failures.push({ rule: 'EMPLOYMENT', message: 'Unemployed applicants are not eligible.' });
  }
  return failures;
}
