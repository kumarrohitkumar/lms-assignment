import bcrypt from 'bcryptjs';
import { AppError, conflict } from '../../lib/errors';
import { Role } from '../../lib/roles';
import { User } from '../../models/User';
import type { LoginInput, RegisterInput } from './auth.schemas';

const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function toPublicUser(user: { _id: unknown; name: string; email: string; role: string }): PublicUser {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role as Role };
}

/** Public sign-up always creates a borrower; staff accounts come from the seed script. */
export async function registerBorrower(input: RegisterInput) {
  if (await User.exists({ email: input.email })) throw conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return User.create({ name: input.name, email: input.email, passwordHash, role: Role.BORROWER });
}

export async function verifyCredentials({ email, password }: LoginInput) {
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same error for unknown email and wrong password, so emails can't be enumerated.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return user;
}
