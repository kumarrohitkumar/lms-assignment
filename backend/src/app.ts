import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { collectionRouter } from './modules/collection/collection.routes';
import { decisionsRouter } from './modules/decisions/decisions.routes';
import { createBorrowerRouter } from './modules/borrower/borrower.routes';
import { disbursementRouter } from './modules/disbursement/disbursement.routes';
import { createLoansRouter } from './modules/loans/loans.routes';
import { salesRouter } from './modules/sales/sales.routes';
import { sanctionRouter } from './modules/sanction/sanction.routes';
import type { StorageDriver } from './storage/StorageDriver';

export interface AppDeps {
  storage: StorageDriver;
  corsOrigins?: string[];
  /** Reverse proxies in front of the API (Railway edge = 1; Vercel rewrite + Railway edge = 2). Used for req.ip. */
  trustProxyHops?: number;
}

export function createApp({ storage, corsOrigins = [], trustProxyHops = 1 }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  // Responses are per-user and change as staff act on loans: never cache them in browsers or proxies.
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/borrower', createBorrowerRouter({ storage }));
  app.use('/api/loans', createLoansRouter({ storage }));
  app.use('/api/sales', salesRouter);
  app.use('/api/sanction', sanctionRouter);
  app.use('/api/disbursement', disbursementRouter);
  app.use('/api/collection', collectionRouter);
  app.use('/api/decisions', decisionsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
