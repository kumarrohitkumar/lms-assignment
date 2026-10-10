import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Payment } from '../src/models/Payment';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** ₹1,00,000 for 365 days → total repayment ₹1,12,000. */
async function disbursedLoan() {
  const { loanId, borrower } = await createAppliedLoan(app, loginAs, { principal: 100000, tenureDays: 365 });
  const admin = await loginAs(app, 'ADMIN');
  await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', admin.cookie).expect(200);
  await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', admin.cookie).send({ reference: 'NEFT00000001' }).expect(200);
  const collection = await loginAs(app, 'COLLECTION');
  return { loanId, borrower, cookie: collection.cookie };
}

const pay = (loanId: string, cookie: string, body: Record<string, unknown>) =>
  request(app).post(`/api/collection/loans/${loanId}/payments`).set('Cookie', cookie).send(body);

describe('collection module', () => {
  it('lists DISBURSED loans with outstanding balance', async () => {
    const { loanId, cookie } = await disbursedLoan();
    const res = await request(app).get('/api/collection/loans').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.loans).toHaveLength(1);
    expect(res.body.loans[0]).toMatchObject({ id: loanId, status: 'DISBURSED', outstanding: 112000, amountPaid: 0 });
  });

  it('records a partial payment and reduces the outstanding balance', async () => {
    const { loanId, cookie } = await disbursedLoan();
    const res = await pay(loanId, cookie, { utr: 'utr0000000001', amount: 40000.5, paymentDate: today() });

    expect(res.status).toBe(201);
    expect(res.body.payment).toMatchObject({ utr: 'UTR0000000001', amount: 40000.5, paymentDate: today() });
    expect(res.body.loan).toMatchObject({ status: 'DISBURSED', amountPaid: 40000.5, outstanding: 71999.5 });

    const history = await request(app).get(`/api/collection/loans/${loanId}/payments`).set('Cookie', cookie);
    expect(history.status).toBe(200);
    expect(history.body.payments).toHaveLength(1);
    expect(history.body.loan.outstanding).toBe(71999.5);
  });

  it('auto-closes the loan when the total repayment is fully paid', async () => {
    const { loanId, cookie, borrower } = await disbursedLoan();
    await pay(loanId, cookie, { utr: 'UTR0000000001', amount: 100000, paymentDate: today() }).expect(201);
    const res = await pay(loanId, cookie, { utr: 'UTR0000000002', amount: 12000, paymentDate: today() });

    expect(res.status).toBe(201);
    expect(res.body.loan).toMatchObject({ status: 'CLOSED', outstanding: 0, amountPaid: 112000, closedAt: expect.any(String) });
    expect(res.body.loan.statusHistory.at(-1)).toMatchObject({ from: 'DISBURSED', to: 'CLOSED', by: null });

    const queue = await request(app).get('/api/collection/loans').set('Cookie', cookie);
    expect(queue.body.loans).toHaveLength(0);
    const own = await request(app).get('/api/borrower/loans').set('Cookie', borrower.cookie);
    expect(own.body.loans[0].status).toBe('CLOSED');

    const afterClose = await pay(loanId, cookie, { utr: 'UTR0000000003', amount: 1, paymentDate: today() });
    expect(afterClose.status).toBe(409);
    expect(afterClose.body.error.code).toBe('LOAN_NOT_ACTIVE');
  });

  it('rejects a duplicate UTR (case-insensitive) with 409, even across loans', async () => {
    const a = await disbursedLoan();
    const b = await disbursedLoan();
    await pay(a.loanId, a.cookie, { utr: 'UTR123456789', amount: 1000, paymentDate: today() }).expect(201);
    const dup = await pay(b.loanId, b.cookie, { utr: ' utr123456789 ', amount: 1000, paymentDate: today() });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_UTR');
    expect(await Payment.countDocuments()).toBe(1);
  });

  it('rejects an amount above the outstanding balance', async () => {
    const { loanId, cookie } = await disbursedLoan();
    const res = await pay(loanId, cookie, { utr: 'UTR0000000001', amount: 112000.01, paymentDate: today() });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AMOUNT_EXCEEDS_OUTSTANDING');
    expect(await Payment.countDocuments()).toBe(0);
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -10 }],
    ['three decimals', { amount: 10.123 }],
    ['amount as a string', { amount: '100' }],
    ['short UTR', { utr: 'AB12' }],
    ['UTR with symbols', { utr: 'UTR-0000-0001' }],
    ['future date', { paymentDate: '2999-01-01' }],
    ['bad date', { paymentDate: 'yesterday' }],
  ])('rejects %s with 400', async (_label, patch) => {
    const { loanId, cookie } = await disbursedLoan();
    const res = await pay(loanId, cookie, { utr: 'UTR0000000001', amount: 100, paymentDate: today(), ...patch });
    expect(res.status).toBe(400);
  });

  it('rejects a payment dated before disbursal', async () => {
    const { loanId, cookie } = await disbursedLoan();
    const res = await pay(loanId, cookie, { utr: 'UTR0000000001', amount: 100, paymentDate: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_BEFORE_DISBURSAL');
  });

  it('rejects payments on loans that are not disbursed', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'COLLECTION');
    const res = await pay(loanId, cookie, { utr: 'UTR0000000001', amount: 100, paymentDate: today() });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LOAN_NOT_ACTIVE');
  });

  it('never lets concurrent payments overpay', async () => {
    const { loanId, cookie } = await disbursedLoan();
    const results = await Promise.all(
      [1, 2, 3].map((n) => pay(loanId, cookie, { utr: `UTRCONCURRENT${n}`, amount: 60000, paymentDate: today() })),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const history = await request(app).get(`/api/collection/loans/${loanId}/payments`).set('Cookie', cookie);
    expect(history.body.payments).toHaveLength(1);
    expect(history.body.loan.amountPaid).toBe(60000);
  });

  it('allows ADMIN, forbids other roles', async () => {
    const { loanId } = await disbursedLoan();
    for (const role of ['SALES', 'SANCTION', 'DISBURSEMENT', 'BORROWER'] as const) {
      const { cookie } = await loginAs(app, role);
      expect((await request(app).get('/api/collection/loans').set('Cookie', cookie)).status).toBe(403);
      expect((await pay(loanId, cookie, { utr: 'UTR0000000009', amount: 1, paymentDate: today() })).status).toBe(403);
    }
    const admin = await loginAs(app, 'ADMIN');
    expect((await pay(loanId, admin.cookie, { utr: 'UTR0000000009', amount: 1, paymentDate: today() })).status).toBe(201);
  });
});
