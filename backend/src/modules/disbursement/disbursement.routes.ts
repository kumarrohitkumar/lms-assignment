import { Router } from 'express';
import { LoanStatus } from '../../lib/loanStatus';
import { MODULE_ROLES } from '../../lib/roles';
import { serializeLoan } from '../../lib/serializers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { listLoansByStatus, transitionLoan } from '../loans/loan.service';

export const disbursementRouter = Router();
disbursementRouter.use(authenticate, authorize(...MODULE_ROLES.disbursement));

disbursementRouter.get('/loans', async (_req, res) => {
  const loans = await listLoansByStatus(LoanStatus.SANCTIONED);
  res.json({ loans: loans.map(serializeLoan) });
});

disbursementRouter.post('/loans/:id/disburse', async (req, res) => {
  const loan = await transitionLoan(String(req.params.id), LoanStatus.DISBURSED, {
    actor: { id: req.user!._id, role: req.user!.role },
    set: { disbursedAt: new Date() },
  });
  res.json({ loan: serializeLoan(loan) });
});
