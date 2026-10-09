/** How far a borrower has got before applying. Shared by the borrower portal and Sales lead tracking. */
export const BorrowerStage = {
  REGISTERED: 'REGISTERED',
  BRE_FAILED: 'BRE_FAILED',
  DETAILS_SUBMITTED: 'DETAILS_SUBMITTED',
  SLIP_UPLOADED: 'SLIP_UPLOADED',
} as const;
export type BorrowerStage = (typeof BorrowerStage)[keyof typeof BorrowerStage];

export function stageOf(profile: { bre?: { passed: boolean } | null; salarySlip?: unknown } | null): BorrowerStage {
  if (!profile) return BorrowerStage.REGISTERED;
  if (!profile.bre?.passed) return BorrowerStage.BRE_FAILED;
  return profile.salarySlip ? BorrowerStage.SLIP_UPLOADED : BorrowerStage.DETAILS_SUBMITTED;
}
