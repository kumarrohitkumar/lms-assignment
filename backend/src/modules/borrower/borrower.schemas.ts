import { z } from 'zod';
import { EMPLOYMENT_MODES } from '../../lib/bre';
import { hasAtMostTwoDecimals } from '../../lib/money';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
  .transform((v) => new Date(`${v}T00:00:00Z`))
  .refine((d) => !Number.isNaN(d.getTime()), 'Enter a valid date');

const rupees = z
  .number({ error: 'Must be a number' })
  .positive('Must be greater than zero')
  .refine(hasAtMostTwoDecimals, 'At most 2 decimal places');

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(100),
  // Format is a BRE rule (422), so only basic shape is validated here.
  pan: z.string().trim().toUpperCase().min(1, 'PAN is required').max(20),
  dateOfBirth: isoDate
    .refine((d) => d.getTime() <= Date.now(), 'Date of birth cannot be in the future')
    .refine((d) => d.getUTCFullYear() >= 1900, 'Enter a valid date of birth'),
  monthlySalary: rupees.max(100_000_000, 'Salary looks too large'),
  employmentMode: z.enum(EMPLOYMENT_MODES, { error: 'Choose Salaried, Self-Employed or Unemployed' }),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export { isoDate, rupees };
