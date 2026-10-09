import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../lib/errors';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return new AppError(413, 'FILE_TOO_LARGE', 'File must be 5 MB or smaller');
    return new AppError(400, 'UPLOAD_ERROR', err.message);
  }
  if (err instanceof mongoose.Error.CastError) return new AppError(404, 'NOT_FOUND', 'Resource not found');
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    return new AppError(409, 'DUPLICATE', 'A record with the same unique value already exists');
  }
  if (err instanceof SyntaxError && 'body' in err) return new AppError(400, 'INVALID_JSON', 'Malformed JSON body');
  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = toAppError(err);
  if (appError.status >= 500 && process.env.NODE_ENV !== 'test') console.error(err);
  const body: { code: string; message: string; details?: unknown } = {
    code: appError.code,
    message: appError.message,
  };
  if (appError.details !== undefined) body.details = appError.details;
  res.status(appError.status).json({ error: body });
};
