import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

async function fullLifecycle() {
  const { loanId, borrower } = await createAppliedLoan(app, loginAs, { principal: 50000, tenureDays: 30 });
  const sanction = await loginAs(app, 'SANCTION', { name: 'Sana Sanction' });
  const disb = await loginAs(app, 'DISBURSEMENT', { name: 'Dev Disburse' });
  const coll = await loginAs(app, 'COLLECTION', { name: 'Kabir Collect' });
  await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', sanction.cookie).send({ remark: 'All good' }).expect(200);
  await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', disb.cookie).send({ reference: 'NEFT12345678' }).expect(200);
  const p = await request(app).post(`/api/collection/loans/${loanId}/payments`).set('Cookie', coll.cookie).send({ utr: 'UTR111111111', amount: 10000, paymentDate: today() }).expect(201);
  await request(app).post(`/api/collection/payments/${p.body.payment.id}/reverse`).set('Cookie', coll.cookie).send({ reason: 'Bounced' }).expect(200);
  await request(app).post(`/api/collection/loans/${loanId}/payments`).set('Cookie', coll.cookie).send({ utr: 'UTR222222222', amount: 50493.15, paymentDate: today() }).expect(201);
  return { loanId, borrower };
}

describe('GET /api/loans/:id (full history)', () => {
  it('returns a timeline of every event with who did it, plus payments', async () => {
    const { loanId, borrower } = await fullLifecycle();
    const res = await request(app).get(`/api/loans/${loanId}`).set('Cookie', borrower.cookie);
    expect(res.status).toBe(200);
    const { timeline, payments, loan } = res.body;
    expect(loan.status).toBe('CLOSED');

    const kinds = timeline.map((e: { type: string }) => e.type);
    expect(kinds).toEqual(['STATUS', 'STATUS', 'STATUS', 'PAYMENT', 'REVERSAL', 'PAYMENT', 'STATUS']);
    expect(timeline[1]).toMatchObject({ type: 'STATUS', to: 'SANCTIONED', note: 'All good', actor: { name: 'Sana Sanction', role: 'SANCTION' } });
    expect(timeline[2]).toMatchObject({ to: 'DISBURSED', note: expect.stringContaining('NEFT12345678'), actor: { name: 'Dev Disburse' } });
    expect(timeline[3]).toMatchObject({ type: 'PAYMENT', utr: 'UTR111111111', amount: 10000, actor: { name: 'Kabir Collect' } });
    expect(timeline[4]).toMatchObject({ type: 'REVERSAL', utr: 'UTR111111111', note: 'Bounced' });
    expect(timeline[6]).toMatchObject({ to: 'CLOSED', actor: { name: 'System', role: 'SYSTEM' } });
    expect(payments).toHaveLength(2);
  });

  it('is visible to the owner and loan-handling staff, not to other borrowers or sales', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    for (const role of ['ADMIN', 'SANCTION', 'DISBURSEMENT', 'COLLECTION'] as const) {
      const s = await loginAs(app, role);
      expect((await request(app).get(`/api/loans/${loanId}`).set('Cookie', s.cookie)).status).toBe(200);
    }
    for (const role of ['SALES', 'BORROWER'] as const) {
      const s = await loginAs(app, role);
      expect((await request(app).get(`/api/loans/${loanId}`).set('Cookie', s.cookie)).status).toBe(403);
    }
  });
});

describe('GET /api/loans (admin history)', () => {
  it('lists every loan newest first with status filter, search and pagination', async () => {
    const a = await createAppliedLoan(app, loginAs);
    await fullLifecycle();
    const admin = await loginAs(app, 'ADMIN');

    const all = await request(app).get('/api/loans').set('Cookie', admin.cookie);
    expect(all.status).toBe(200);
    expect(all.body).toMatchObject({ total: 2, page: 1, pageSize: 20 });
    expect(all.body.loans[0].status).toBe('CLOSED'); // newest first

    const closed = await request(app).get('/api/loans?status=CLOSED').set('Cookie', admin.cookie);
    expect(closed.body.loans.map((l: { status: string }) => l.status)).toEqual(['CLOSED']);

    const email = (await request(app).get('/api/auth/me').set('Cookie', a.borrower.cookie)).body.user.email;
    const found = await request(app).get(`/api/loans?q=${encodeURIComponent(email)}`).set('Cookie', admin.cookie);
    expect(found.body.loans.map((l: { id: string }) => l.id)).toEqual([a.loanId]);

    const paged = await request(app).get('/api/loans?pageSize=1&page=2').set('Cookie', admin.cookie);
    expect(paged.body).toMatchObject({ page: 2, pageSize: 1, total: 2 });
    expect(paged.body.loans).toHaveLength(1);
  });

  it('is admin only', async () => {
    for (const role of ['SALES', 'SANCTION', 'DISBURSEMENT', 'COLLECTION', 'BORROWER'] as const) {
      const s = await loginAs(app, role);
      expect((await request(app).get('/api/loans').set('Cookie', s.cookie)).status).toBe(403);
    }
  });
});

describe('GET /api/admin/overview', () => {
  it('summarises the portfolio', async () => {
    await createAppliedLoan(app, loginAs, { principal: 100000, tenureDays: 90 });
    await fullLifecycle();
    await loginAs(app, 'BORROWER'); // a lead
    const admin = await loginAs(app, 'ADMIN');
    const res = await request(app).get('/api/admin/overview').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      counts: { APPLIED: 1, SANCTIONED: 0, DISBURSED: 0, CLOSED: 1, REJECTED: 0 },
      leads: 1, // the borrower who registered but never applied
      money: { disbursed: 50000, collected: 50493.15, outstanding: 0 },
    });
  });

  it('is admin only', async () => {
    const s = await loginAs(app, 'SANCTION');
    expect((await request(app).get('/api/admin/overview').set('Cookie', s.cookie)).status).toBe(403);
  });
});
