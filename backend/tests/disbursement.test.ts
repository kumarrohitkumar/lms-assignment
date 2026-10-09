import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

async function sanctionedLoan() {
  const { loanId } = await createAppliedLoan(app, loginAs);
  const sanction = await loginAs(app, 'SANCTION');
  await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', sanction.cookie).expect(200);
  return loanId;
}

describe('disbursement module', () => {
  it('lists only SANCTIONED loans', async () => {
    const loanId = await sanctionedLoan();
    await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'DISBURSEMENT');
    const res = await request(app).get('/api/disbursement/loans').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.loans.map((l: { id: string }) => l.id)).toEqual([loanId]);
  });

  it('disburses: SANCTIONED → DISBURSED', async () => {
    const loanId = await sanctionedLoan();
    const { cookie } = await loginAs(app, 'DISBURSEMENT');
    const res = await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.loan).toMatchObject({ status: 'DISBURSED', disbursedAt: expect.any(String), outstanding: 112000 });
  });

  it('cannot disburse a loan that has not been sanctioned', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'DISBURSEMENT');
    const res = await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', cookie);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('forbids other executive roles', async () => {
    const loanId = await sanctionedLoan();
    for (const role of ['SALES', 'SANCTION', 'COLLECTION', 'BORROWER'] as const) {
      const { cookie } = await loginAs(app, role);
      expect((await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', cookie)).status).toBe(403);
    }
  });
});
