import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import type { Role } from '../lib/roles';
import { User } from '../models/User';

export const AUTH_COOKIE = 'lms_token';

interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: { _id: unknown; role: Role }): string {
  return jwt.sign({ sub: String(user._id), role: user.role }, env().JWT_SECRET, {
    expiresIn: env().JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue');

function readToken(header: string | undefined, cookie: string | undefined): string | undefined {
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();
  return cookie;
}

/**
 * Verifies the JWT and reloads the user so deleted users or role changes take effect immediately.
 * Missing/invalid token → 401.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = readToken(req.headers.authorization, req.cookies?.[AUTH_COOKIE]);
  if (!token) return next(unauthenticated());

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env().JWT_SECRET) as TokenPayload;
  } catch {
    return next(unauthenticated());
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) return next(unauthenticated());

  req.user = { id: String(user._id), _id: user._id, name: user.name, email: user.email, role: user.role as Role };
  next();
};
