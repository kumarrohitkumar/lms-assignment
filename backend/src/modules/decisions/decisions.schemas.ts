import { z } from 'zod';
import { type DecisionStage, REJECTION_CATEGORIES } from '../../lib/decisions';

const note = z.string().trim().max(500).optional().transform((v) => (v ? v : undefined));

/**
 * `{ category, note? }`; OTHER needs a note. The original `{ reason }` body is still accepted
 * and treated as OTHER with that reason as the note.
 */
export function rejectSchema(stage: DecisionStage) {
  const values = REJECTION_CATEGORIES[stage].map((c) => c.value) as [string, ...string[]];
  return z
    .object({
      category: z.enum(values, { error: 'Choose a rejection reason' }).optional(),
      note,
      reason: z.string().trim().max(500).optional(),
    })
    .transform((b) => (b.category ? { category: b.category, note: b.note } : { category: 'OTHER', note: b.reason || b.note }))
    .refine((b) => b.category !== 'OTHER' || (b.note?.length ?? 0) >= 3, {
      message: 'Describe the reason (at least 3 characters)',
      path: ['note'],
    });
}

export const approveSchema = z.object({ remark: note });

export const disburseSchema = z.object({
  reference: z
    .string({ error: 'Enter the bank transfer reference' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,30}$/, 'Reference must be 6–30 letters or digits'),
  remark: note,
});

export type RejectInput = { category: string; note?: string };
