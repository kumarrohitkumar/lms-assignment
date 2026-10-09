import { stageOf } from '../../lib/borrowerStage';
import { toRupees } from '../../lib/money';
import { Role } from '../../lib/roles';
import { User } from '../../models/User';

interface LeadRow {
  _id: unknown;
  name: string;
  email: string;
  createdAt: Date;
  profile: {
    fullName: string;
    monthlySalary: number;
    employmentMode: string;
    bre?: { passed: boolean; failures: { message: string }[] };
    salarySlip?: unknown;
  } | null;
}

/** Leads = borrowers who registered but have never applied for a loan. */
export async function listLeads() {
  const rows = await User.aggregate<LeadRow>([
    { $match: { role: Role.BORROWER } },
    { $lookup: { from: 'loans', localField: '_id', foreignField: 'borrower', as: 'loans', pipeline: [{ $limit: 1 }] } },
    { $match: { loans: { $size: 0 } } },
    { $lookup: { from: 'borrowerprofiles', localField: '_id', foreignField: 'user', as: 'profile' } },
    { $project: { name: 1, email: 1, createdAt: 1, profile: { $ifNull: [{ $first: '$profile' }, null] } } },
    { $sort: { createdAt: -1 } },
  ]);

  return rows.map((row) => ({
    id: String(row._id),
    name: row.name,
    email: row.email,
    registeredAt: row.createdAt,
    stage: stageOf(row.profile),
    profile: row.profile
      ? {
          fullName: row.profile.fullName,
          monthlySalary: toRupees(row.profile.monthlySalary),
          employmentMode: row.profile.employmentMode,
          breFailures: row.profile.bre?.failures.map((f) => f.message) ?? [],
        }
      : null,
  }));
}
