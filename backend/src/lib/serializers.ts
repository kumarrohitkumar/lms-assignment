import { toRupees } from './money';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

interface SlipLike {
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export function serializeSlip(slip: SlipLike | null | undefined) {
  if (!slip) return null;
  return { originalName: slip.originalName, mimeType: slip.mimeType, size: slip.size, uploadedAt: slip.uploadedAt };
}

export function serializeProfile(p: {
  fullName: string;
  pan: string;
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: string;
  bre?: { passed: boolean; failures: { rule?: string | null; message?: string | null }[]; checkedAt: Date } | null;
  salarySlip?: SlipLike | null;
}) {
  return {
    fullName: p.fullName,
    pan: p.pan,
    dateOfBirth: isoDate(p.dateOfBirth),
    monthlySalary: toRupees(p.monthlySalary),
    employmentMode: p.employmentMode,
    bre: p.bre ? { passed: p.bre.passed, failures: p.bre.failures.map((f) => ({ rule: f.rule, message: f.message })), checkedAt: p.bre.checkedAt } : null,
    salarySlip: serializeSlip(p.salarySlip),
  };
}
