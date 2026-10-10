import { Router } from 'express';
import { LoanStatus } from '../../lib/loanStatus';
import { MODULE_ROLES } from '../../lib/roles';
import { serializeLoan, serializePayment } from '../../lib/serializers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { listLoansByStatus } from '../loans/loan.service';
import { paymentSchema, reverseSchema } from './collection.schemas';
import { listPayments, recordPayment, reversePayment } from './collection.service';

export const collectionRouter = Router();
collectionRouter.use(authenticate, authorize(...MODULE_ROLES.collection));

collectionRouter.get('/loans', async (req, res) => {
  const closed = req.query.view === 'closed';
  const loans = (await listLoansByStatus(closed ? LoanStatus.CLOSED : LoanStatus.DISBURSED, req.query.q)).map(serializeLoan);
  // Active loans: overdue first, then whatever falls due soonest. Closed loans: most recently closed first.
  if (closed) loans.sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0));
  else loans.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  res.json({ loans });
});

collectionRouter.get('/loans/:id/payments', async (req, res) => {
  const { loan, payments } = await listPayments(String(req.params.id));
  res.json({ loan: serializeLoan(loan), payments: payments.map(serializePayment) });
});

collectionRouter.post('/loans/:id/payments', validateBody(paymentSchema), async (req, res) => {
  const { loan, payment } = await recordPayment(String(req.params.id), req.body, req.user!._id);
  res.status(201).json({ loan: serializeLoan(loan), payment: serializePayment(payment) });
});

collectionRouter.post('/payments/:id/reverse', validateBody(reverseSchema), async (req, res) => {
  const { loan, payment } = await reversePayment(String(req.params.id), req.body.reason, req.user!._id);
  res.json({ loan: serializeLoan(loan), payment: serializePayment(payment) });
});
