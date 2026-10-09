import bcrypt from 'bcryptjs';
import { Role } from '../lib/roles';
import { User } from '../models/User';

export const SEED_PASSWORD = 'Password@123';

export const SEED_ACCOUNTS: { name: string; email: string; role: Role }[] = [
  { name: 'Admin', email: 'admin@lms.dev', role: Role.ADMIN },
  { name: 'Sales Executive', email: 'sales@lms.dev', role: Role.SALES },
  { name: 'Sanction Executive', email: 'sanction@lms.dev', role: Role.SANCTION },
  { name: 'Disbursement Executive', email: 'disbursement@lms.dev', role: Role.DISBURSEMENT },
  { name: 'Collection Executive', email: 'collection@lms.dev', role: Role.COLLECTION },
  { name: 'Demo Borrower', email: 'borrower@lms.dev', role: Role.BORROWER },
];

/** Upserts one account per role and resets its password, so it can be re-run any time. */
export async function seedUsers() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  await User.bulkWrite(
    SEED_ACCOUNTS.map((account) => ({
      updateOne: {
        filter: { email: account.email },
        update: { $set: { name: account.name, role: account.role, passwordHash } },
        upsert: true,
      },
    })),
  );
  return SEED_ACCOUNTS;
}
