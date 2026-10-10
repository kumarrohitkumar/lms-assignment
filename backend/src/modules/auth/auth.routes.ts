import { type CookieOptions, type Response, Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AUTH_COOKIE, authenticate, signToken } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate';
import type { Role } from '../../lib/roles';
import { loginSchema, registerSchema } from './auth.schemas';
import { registerBorrower, toPublicUser, verifyCredentials } from './auth.service';

function cookieOptions(): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: env().NODE_ENV === 'production', path: '/' };
}

function issueSession(res: Response, user: { _id: unknown; name: string; email: string; role: string }) {
  const token = signToken({ _id: user._id, role: user.role as Role });
  // Cookie lifetime follows the token's own expiry (JWT_EXPIRES_IN), so the two never drift apart.
  const { exp } = jwt.decode(token) as { exp: number };
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), expires: new Date(exp * 1000) });
  // The token is also returned for non-browser API clients that send `Authorization: Bearer`.
  return { user: toPublicUser(user), token };
}

const tooMany = { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again in a few minutes.' } };
const FIFTEEN_MINUTES = 15 * 60 * 1000;
// Off in tests, which log in hundreds of times.
const skipInTests = () => env().NODE_ENV === 'test';

/**
 * Keyed by client IP *and* account. Behind shared proxies many users can appear with the same IP,
 * so an IP-only key would let one person lock everyone out; per-account keys still stop password guessing.
 */
export function loginRateKey(req: { ip?: string; body?: { email?: unknown } }): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${ipKeyGenerator(req.ip ?? '')}|${email}`;
}

const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: loginRateKey,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTests,
  message: tooMany,
});

const registerLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTests,
  message: tooMany,
});

export const authRouter = Router();

authRouter.post('/register', registerLimiter, validateBody(registerSchema), async (req, res) => {
  const user = await registerBorrower(req.body);
  res.status(201).json(issueSession(res, user));
});

authRouter.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const user = await verifyCredentials(req.body);
  res.json(issueSession(res, user));
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
  res.status(204).end();
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: toPublicUser({ ...req.user!, _id: req.user!.id }) });
});
