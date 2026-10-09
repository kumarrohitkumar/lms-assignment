import { Router } from 'express';
import { pipeline } from 'node:stream/promises';
import { AppError } from '../../lib/errors';
import { Role } from '../../lib/roles';
import { authenticate } from '../../middleware/authenticate';
import type { StorageDriver } from '../../storage';
import { findLoanOrThrow } from './loan.service';

/** Staff who work on submitted loans. Sales only handles pre-application leads. */
const SLIP_VIEWERS: Role[] = [Role.ADMIN, Role.SANCTION, Role.DISBURSEMENT, Role.COLLECTION];

export function createLoansRouter({ storage }: { storage: StorageDriver }) {
  const router = Router();
  router.use(authenticate);

  router.get('/:id/salary-slip', async (req, res) => {
    const loan = await findLoanOrThrow(String(req.params.id));
    const user = req.user!;
    const isOwner = user.role === Role.BORROWER && String(loan.borrower) === user.id;
    if (!isOwner && !SLIP_VIEWERS.includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this document');
    }

    const slip = loan.salarySlip;
    const stream = await storage.getStream(slip.storageKey);
    res.setHeader('Content-Type', slip.mimeType);
    const asciiName = slip.originalName.replace(/[^\x20-\x7e]|["\\]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(slip.originalName)}`);
    res.setHeader('Cache-Control', 'private, no-store');
    await pipeline(stream, res);
  });

  return router;
}
