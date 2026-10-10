import { Router } from 'express';
import { LoanStatus } from '../../lib/loanStatus';
import { MODULE_ROLES } from '../../lib/roles';
import { serializeLoan } from '../../lib/serializers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { approveSchema, type RejectInput, rejectSchema } from '../decisions/decisions.schemas';
import { listStageDecisions } from '../loans/decided.service';
import { listLoansByStatus, rejectLoan, transitionLoan } from '../loans/loan.service';

export const sanctionRouter = Router();
sanctionRouter.use(authenticate, authorize(...MODULE_ROLES.sanction));

sanctionRouter.get('/loans', async (req, res) => {
  const loans = await listLoansByStatus(LoanStatus.APPLIED, req.query.q);
  res.json({ loans: loans.map(serializeLoan) });
});

sanctionRouter.get('/decisions', async (req, res) => {
  res.json(await listStageDecisions('SANCTION', req.query.q));
});

sanctionRouter.post('/loans/:id/approve', validateBody(approveSchema), async (req, res) => {
  const loan = await transitionLoan(String(req.params.id), LoanStatus.SANCTIONED, {
    actor: { id: req.user!._id, role: req.user!.role },
    note: req.body.remark,
    set: { sanctionedAt: new Date() },
  });
  res.json({ loan: serializeLoan(loan) });
});

sanctionRouter.post('/loans/:id/reject', validateBody(rejectSchema('SANCTION')), async (req, res) => {
  const loan = await rejectLoan(String(req.params.id), 'SANCTION', req.body as RejectInput, { id: req.user!._id, role: req.user!.role });
  res.json({ loan: serializeLoan(loan) });
});
