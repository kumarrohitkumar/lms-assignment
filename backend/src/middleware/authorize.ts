import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import type { Role } from '../lib/roles';

/** Must run after `authenticate`. Authenticated but wrong role → 403. */
export function authorize(...allowed: readonly Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue'));
    if (!allowed.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this resource'));
    }
    next();
  };
}
