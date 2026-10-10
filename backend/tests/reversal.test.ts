import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Payment } from '../src/models/Payment';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** ₹50,000 for 30 days → total ₹50,493.15 */
async function activeLoan() {
  const { loanId, borrower } = await createAppliedLoan(app, loginAs, { principal: 50000, tenureDays: 30 });
  const admin = await loginAs(app, 'ADMIN');
  await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', admin.cookie).expect(200);
  await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', admin.cookie).send({ reference: 'NEFT00000001' }).expect(200);
  const collection = await loginAs(app, 'COLLECTION');
  return { loanId, borrower, cookie: collection.cookie };
}

const pay = (loanId: string, cookie: string, utr: string, amount: number) =>
  request(app).post(`/api/collection/loans/${loanId}/payments`).set('Cookie', cookie).send({ utr, amount, paymentDate: today() });

const reverse = (paymentId: string, cookie: string, body: Record<string, unknown>) =>
  request(app).post(`/api/collection/payments/${paymentId}/reverse`).set('Cookie', cookie).send(body);

describe('payment reversal', () => {
  it('reverses a payment with a reason and restores the outstanding balance', async () => {
    const { loanId, cookie } = await activeLoan();
    const p = await pay(loanId, cookie, 'UTR000000001', 20000).expect(201);

    const res = await reverse(p.body.payment.id, cookie, { reason: 'Cheque bounced — insufficient funds' });
    expect(res.status).toBe(200);
    expect(res.body.payment).toMatchObject({ status: 'REVERSED', reversal: { reason: 'Cheque bounced — insufficient funds', at: expect.any(String) } });
    expect(res.body.loan).toMatchObject({ status: 'DISBURSED', amountPaid: 0, outstanding: 50493.15 });

    const history = await request(app).get(`/api/collection/loans/${loanId}/payments`).set('Cookie', cookie);
    expect(history.body.payments).toHaveLength(1);
    expect(history.body.payments[0].status).toBe('REVERSED');
    expect(await Payment.countDocuments()).toBe(1); // kept for the audit trail
  });

  it('reopens a loan that the reversed payment had closed', async () => {
    const { loanId, cookie, borrower } = await activeLoan();
    const p = await pay(loanId, cookie, 'UTR000000001', 50493.15).expect(201);
    expect(p.body.loan.status).toBe('CLOSED');

    const res = await reverse(p.body.payment.id, cookie, { reason: 'Payment recalled by bank' });
    expect(res.body.loan).toMatchObject({ status: 'DISBURSED', outstanding: 50493.15, closedAt: null });
    expect(res.body.loan.statusHistory.at(-1)).toMatchObject({ from: 'CLOSED', to: 'DISBURSED', note: expect.stringContaining('UTR000000001') });

    const own = await request(app).get('/api/borrower/loans').set('Cookie', borrower.cookie);
    expect(own.body.loans[0].status).toBe('DISBURSED');
  });

  it('requires a reason, refuses to reverse twice, and the UTR stays used', async () => {
    const { loanId, cookie } = await activeLoan();
    const p = await pay(loanId, cookie, 'UTR000000001', 1000).expect(201);
    expect((await reverse(p.body.payment.id, cookie, {})).status).toBe(400);
    await reverse(p.body.payment.id, cookie, { reason: 'Wrong loan' }).expect(200);
    const again = await reverse(p.body.payment.id, cookie, { reason: 'Again' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_REVERSED');
    expect((await pay(loanId, cookie, 'UTR000000001', 1000)).status).toBe(409);
  });

  it('lists closed loans for collection so their payments can still be reviewed', async () => {
    const { loanId, cookie } = await activeLoan();
    await pay(loanId, cookie, 'UTR000000001', 50493.15).expect(201);
    const closed = await request(app).get('/api/collection/loans?view=closed').set('Cookie', cookie);
    expect(closed.body.loans.map((l: { id: string }) => l.id)).toContain(loanId);
    const active = await request(app).get('/api/collection/loans').set('Cookie', cookie);
    expect(active.body.loans.map((l: { id: string }) => l.id)).not.toContain(loanId);
  });

  it('is limited to collection staff and admin', async () => {
    const { loanId, cookie } = await activeLoan();
    const p = await pay(loanId, cookie, 'UTR000000001', 1000).expect(201);
    for (const role of ['SALES', 'SANCTION', 'DISBURSEMENT', 'BORROWER'] as const) {
      const other = await loginAs(app, role);
      expect((await reverse(p.body.payment.id, other.cookie, { reason: 'nope' })).status).toBe(403);
    }
    expect((await reverse('64b7f0000000000000000000', cookie, { reason: 'missing' })).status).toBe(404);
  });
});
