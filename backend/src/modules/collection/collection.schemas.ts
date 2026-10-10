import { z } from 'zod';
import { isRealIsoDate, todayIst } from '../../lib/dates';
import { hasAtMostTwoDecimals } from '../../lib/money';

export const paymentSchema = z.object({
  utr: z
    .string({ error: 'UTR number is required' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8,30}$/, 'UTR must be 8–30 letters or digits'),
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be greater than zero')
    .refine(hasAtMostTwoDecimals, 'Amount can have at most 2 decimal places'),
  paymentDate: z
    .string({ error: 'Payment date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
    .refine(isRealIsoDate, 'Enter a valid date')
    .refine((v) => v <= todayIst(), 'Payment date cannot be in the future'),
});

export const reverseSchema = z.object({
  reason: z.string({ error: 'Give a reason for the reversal' }).trim().min(3, 'Give a reason of at least 3 characters').max(300),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
