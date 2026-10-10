import { Router } from 'express';
import { LoanStatus } from '../../lib/loanStatus';
import { MODULE_ROLES } from '../../lib/roles';
import { serializeLoan } from '../../lib/serializers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { disburseSchema, type RejectInput, rejectSchema } from '../decisions/decisions.schemas';
import { listLoansByStatus, rejectLoan, transitionLoan } from '../loans/loan.service';

export const disbursementRouter = Router();
disbursementRouter.use(authenticate, authorize(...MODULE_ROLES.disbursement));

disbursementRouter.get('/loans', async (req, res) => {
  const loans = await listLoansByStatus(LoanStatus.SANCTIONED, req.query.q);
  res.json({ loans: loans.map(serializeLoan) });
});

disbursementRouter.post('/loans/:id/disburse', validateBody(disburseSchema), async (req, res) => {
  const now = new Date();
  const { reference, remark } = req.body as { reference: string; remark?: string };
  const loan = await transitionLoan(String(req.params.id), LoanStatus.DISBURSED, {
    actor: { id: req.user!._id, role: req.user!.role },
    note: remark ? `Ref ${reference} — ${remark}` : `Ref ${reference}`,
    set: { disbursedAt: now, disbursement: { reference, remark: remark ?? null, by: req.user!._id, at: now } },
  });
  res.json({ loan: serializeLoan(loan) });
});

disbursementRouter.post('/loans/:id/reject', validateBody(rejectSchema('DISBURSEMENT')), async (req, res) => {
  const loan = await rejectLoan(String(req.params.id), 'DISBURSEMENT', req.body as RejectInput, { id: req.user!._id, role: req.user!.role });
  res.json({ loan: serializeLoan(loan) });
});
