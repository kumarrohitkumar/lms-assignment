import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

describe('sanction module', () => {
  it('lists APPLIED loans with borrower details', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    const res = await request(app).get('/api/sanction/loans').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.loans).toHaveLength(1);
    expect(res.body.loans[0]).toMatchObject({ id: loanId, status: 'APPLIED', borrower: { email: expect.any(String) } });
  });

  it('approves: APPLIED → SANCTIONED with audit trail', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const { cookie, user } = await loginAs(app, 'SANCTION');
    const res = await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.loan.status).toBe('SANCTIONED');
    expect(res.body.loan.sanctionedAt).toEqual(expect.any(String));
    expect(res.body.loan.statusHistory.at(-1)).toMatchObject({ from: 'APPLIED', to: 'SANCTIONED', by: String(user._id) });

    const queue = await request(app).get('/api/sanction/loans').set('Cookie', cookie);
    expect(queue.body.loans).toHaveLength(0);
  });

  it('rejects with a reason: APPLIED → REJECTED', async () => {
    const { loanId, borrower } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    const res = await request(app)
      .post(`/api/sanction/loans/${loanId}/reject`)
      .set('Cookie', cookie)
      .send({ reason: '  Salary slip is unreadable  ' });

    expect(res.status).toBe(200);
    expect(res.body.loan).toMatchObject({ status: 'REJECTED', rejectionReason: 'Salary slip is unreadable' });

    const own = await request(app).get('/api/borrower/loans').set('Cookie', borrower.cookie);
    expect(own.body.loans[0].rejectionReason).toBe('Salary slip is unreadable');
  });

  it('requires a rejection reason', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    expect((await request(app).post(`/api/sanction/loans/${loanId}/reject`).set('Cookie', cookie).send({ reason: ' ' })).status).toBe(400);
  });

  it('returns 409 when the loan is no longer APPLIED', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', cookie).expect(200);
    const again = await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', cookie);
    expect(again.status).toBe(409);
    expect((await request(app).post(`/api/sanction/loans/${loanId}/reject`).set('Cookie', cookie).send({ reason: 'Too late to reject' })).status).toBe(409);
  });

  it('returns 404 for unknown or malformed ids', async () => {
    const { cookie } = await loginAs(app, 'SANCTION');
    expect((await request(app).post('/api/sanction/loans/64b7f0000000000000000000/approve').set('Cookie', cookie)).status).toBe(404);
    expect((await request(app).post('/api/sanction/loans/not-an-id/approve').set('Cookie', cookie)).status).toBe(404);
  });

  it('allows ADMIN, forbids other roles', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    for (const role of ['SALES', 'DISBURSEMENT', 'COLLECTION', 'BORROWER'] as const) {
      const { cookie } = await loginAs(app, role);
      expect((await request(app).get('/api/sanction/loans').set('Cookie', cookie)).status).toBe(403);
      expect((await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', cookie)).status).toBe(403);
    }
    const admin = await loginAs(app, 'ADMIN');
    expect((await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', admin.cookie)).status).toBe(200);
  });
});
