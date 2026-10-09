import type { Types } from 'mongoose';
import { istDateOf } from '../../lib/dates';
import { AppError, conflict } from '../../lib/errors';
import { assertTransition, LoanStatus } from '../../lib/loanStatus';
import { toPaise, toRupees } from '../../lib/money';
import { Loan } from '../../models/Loan';
import { Payment } from '../../models/Payment';
import { findLoanOrThrow } from '../loans/loan.service';
import type { PaymentInput } from './collection.schemas';

const notActive = () => conflict('Payments can only be recorded against a disbursed (active) loan', 'LOAN_NOT_ACTIVE');
const duplicateUtr = (utr: string) => conflict(`A payment with UTR ${utr} has already been recorded`, 'DUPLICATE_UTR');

export async function listPayments(loanId: string) {
  const loan = await findLoanOrThrow(loanId);
  const payments = await Payment.find({ loan: loan._id }).sort({ paymentDate: 1, createdAt: 1 });
  return { loan: await loan.populate('borrower', 'name email'), payments };
}

/**
 * Records a payment and, when it settles the balance, closes the loan.
 *
 * Steps: validate against the current balance → insert the payment (the unique UTR index rejects
 * duplicates, including concurrent ones) → atomically add to `amountPaid` only if that cannot exceed
 * the total, closing the loan in the same update. If that guarded update fails, the payment is removed.
 */
export async function recordPayment(loanId: string, input: PaymentInput, recordedBy: Types.ObjectId) {
  const loan = await findLoanOrThrow(loanId);
  if (loan.status !== LoanStatus.DISBURSED) throw notActive();

  const amount = toPaise(input.amount);
  const outstanding = loan.totalRepayment - loan.amountPaid;
  if (amount > outstanding) {
    throw new AppError(400, 'AMOUNT_EXCEEDS_OUTSTANDING', `Amount exceeds the outstanding balance of ₹${toRupees(outstanding)}`, {
      outstanding: toRupees(outstanding),
    });
  }
  if (loan.disbursedAt && input.paymentDate < istDateOf(loan.disbursedAt)) {
    throw new AppError(400, 'PAYMENT_BEFORE_DISBURSAL', 'Payment date cannot be before the loan was disbursed');
  }
  if (await Payment.exists({ utr: input.utr })) throw duplicateUtr(input.utr);

  let payment;
  try {
    payment = await Payment.create({
      loan: loan._id,
      utr: input.utr,
      amount,
      paymentDate: new Date(`${input.paymentDate}T00:00:00Z`),
      recordedBy,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw duplicateUtr(input.utr);
    throw err;
  }

  assertTransition(LoanStatus.DISBURSED, LoanStatus.CLOSED, 'SYSTEM');
  const now = new Date();
  const fullyPaid = { $eq: ['$amountPaid', '$totalRepayment'] };
  const closedEntry = { from: LoanStatus.DISBURSED, to: LoanStatus.CLOSED, by: null, at: now, note: 'Fully repaid' };

  let updated;
  try {
    updated = await Loan.findOneAndUpdate(
      {
        _id: loan._id,
        status: LoanStatus.DISBURSED,
        $expr: { $lte: [{ $add: ['$amountPaid', amount] }, '$totalRepayment'] },
      },
      [
        { $set: { amountPaid: { $add: ['$amountPaid', amount] } } },
        {
          $set: {
            status: { $cond: [fullyPaid, LoanStatus.CLOSED, '$status'] },
            closedAt: { $cond: [fullyPaid, now, '$closedAt'] },
            statusHistory: {
              $cond: [fullyPaid, { $concatArrays: ['$statusHistory', [{ $literal: closedEntry }]] }, '$statusHistory'],
            },
          },
        },
      ],
      { returnDocument: 'after', updatePipeline: true },
    ).populate('borrower', 'name email');
  } catch (err) {
    // Treat the update as not applied and remove the payment, so the balance and the payment list agree
    // and the UTR can be retried. Only a transaction (needs a replica set) also covers a write that landed
    // just before the connection dropped; see "Payments" in the README.
    await Payment.deleteOne({ _id: payment._id });
    throw err;
  }

  if (!updated) {
    // Another payment changed the balance (or closed the loan) between our read and write.
    await Payment.deleteOne({ _id: payment._id });
    const fresh = await findLoanOrThrow(loanId);
    if (fresh.status !== LoanStatus.DISBURSED) throw notActive();
    throw new AppError(400, 'AMOUNT_EXCEEDS_OUTSTANDING', `Amount exceeds the outstanding balance of ₹${toRupees(fresh.totalRepayment - fresh.amountPaid)}`);
  }

  return { loan: updated, payment };
}
