import { type CookieOptions, type Response, Router } from 'express';
import { env } from '../../config/env';
import { AUTH_COOKIE, authenticate, signToken } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate';
import type { Role } from '../../lib/roles';
import { loginSchema, registerSchema } from './auth.schemas';
import { registerBorrower, toPublicUser, verifyCredentials } from './auth.service';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function cookieOptions(): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: env().NODE_ENV === 'production', path: '/' };
}

function issueSession(res: Response, user: { _id: unknown; name: string; email: string; role: string }) {
  const token = signToken({ _id: user._id, role: user.role as Role });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: ONE_DAY_MS });
  return { user: toPublicUser(user), token };
}

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  const user = await registerBorrower(req.body);
  res.status(201).json(issueSession(res, user));
});

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
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
