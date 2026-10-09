import type { RequestHandler } from 'express';
import { z } from 'zod';
import { badRequest } from '../lib/errors';

/** Validates and replaces req.body with the parsed (coerced, trimmed) value. */
export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(badRequest(details[0]?.message ?? 'Invalid request', details));
    }
    req.body = result.data;
    next();
  };
}
