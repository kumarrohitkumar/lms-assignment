import { Router } from 'express';
import { z } from 'zod';
import { LoanStatus } from '../../lib/loanStatus';
import { MODULE_ROLES } from '../../lib/roles';
import { serializeLoan } from '../../lib/serializers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { listLoansByStatus, transitionLoan } from '../loans/loan.service';

const rejectSchema = z.object({
  reason: z.string({ error: 'A rejection reason is required' }).trim().min(3, 'Give a reason of at least 3 characters').max(500),
});

export const sanctionRouter = Router();
sanctionRouter.use(authenticate, authorize(...MODULE_ROLES.sanction));

sanctionRouter.get('/loans', async (_req, res) => {
  const loans = await listLoansByStatus(LoanStatus.APPLIED);
  res.json({ loans: loans.map(serializeLoan) });
});

sanctionRouter.post('/loans/:id/approve', async (req, res) => {
  const loan = await transitionLoan(String(req.params.id), LoanStatus.SANCTIONED, {
    actor: { id: req.user!._id, role: req.user!.role },
    set: { sanctionedAt: new Date() },
  });
  res.json({ loan: serializeLoan(loan) });
});

sanctionRouter.post('/loans/:id/reject', validateBody(rejectSchema), async (req, res) => {
  const { reason } = req.body as z.infer<typeof rejectSchema>;
  const loan = await transitionLoan(String(req.params.id), LoanStatus.REJECTED, {
    actor: { id: req.user!._id, role: req.user!.role },
    note: reason,
    set: { rejectionReason: reason },
  });
  res.json({ loan: serializeLoan(loan) });
});
