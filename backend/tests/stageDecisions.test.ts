import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

describe('decided loans per stage', () => {
  it('sanction: lists what was approved and rejected, newest first, with who, when and why', async () => {
    const a = await createAppliedLoan(app, loginAs);
    const b = await createAppliedLoan(app, loginAs);
    const pending = await createAppliedLoan(app, loginAs);
    const { cookie, user } = await loginAs(app, 'SANCTION', { name: 'Sana Iyer' });

    await request(app).post(`/api/sanction/loans/${a.loanId}/approve`).set('Cookie', cookie).send({ remark: 'Slip verified' }).expect(200);
    await request(app)
      .post(`/api/sanction/loans/${b.loanId}/reject`)
      .set('Cookie', cookie)
      .send({ category: 'SLIP_UNREADABLE', note: 'Photo is blurred' })
      .expect(200);

    const res = await request(app).get('/api/sanction/decisions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.loans.map((l: { id: string }) => l.id)).toEqual([b.loanId, a.loanId]);
    expect(res.body.loans.map((l: { id: string }) => l.id)).not.toContain(pending.loanId);

    const [rejected, approved] = res.body.loans;
    expect(rejected.decision).toMatchObject({
      outcome: 'REJECTED',
      by: { id: String(user._id), name: 'Sana Iyer', role: 'SANCTION' },
      reason: 'Salary slip is unclear or unreadable',
      note: 'Photo is blurred',
      at: expect.any(String),
    });
    expect(approved.decision).toMatchObject({ outcome: 'APPROVED', by: { name: 'Sana Iyer' }, note: 'Slip verified', reason: null });
    expect(res.body.counts).toEqual({ approved: 1, rejected: 1 });
  });

  it('sanction: an approved loan stays in the list after it moves on', async () => {
    const a = await createAppliedLoan(app, loginAs);
    const sanction = await loginAs(app, 'SANCTION');
    const disb = await loginAs(app, 'DISBURSEMENT');
    await request(app).post(`/api/sanction/loans/${a.loanId}/approve`).set('Cookie', sanction.cookie).expect(200);
    await request(app).post(`/api/disbursement/loans/${a.loanId}/disburse`).set('Cookie', disb.cookie).send({ reference: 'NEFT123456' }).expect(200);

    const res = await request(app).get('/api/sanction/decisions').set('Cookie', sanction.cookie);
    expect(res.body.loans[0]).toMatchObject({ id: a.loanId, status: 'DISBURSED', decision: { outcome: 'APPROVED' } });
  });

  it('disbursement: lists payouts with the bank reference and stopped loans with the reason', async () => {
    const a = await createAppliedLoan(app, loginAs);
    const b = await createAppliedLoan(app, loginAs);
    const sanction = await loginAs(app, 'SANCTION');
    const { cookie } = await loginAs(app, 'DISBURSEMENT', { name: 'Dev Rao' });
    for (const id of [a.loanId, b.loanId]) await request(app).post(`/api/sanction/loans/${id}/approve`).set('Cookie', sanction.cookie).expect(200);

    await request(app).post(`/api/disbursement/loans/${a.loanId}/disburse`).set('Cookie', cookie).send({ reference: 'NEFT123456', remark: 'HDFC' }).expect(200);
    await request(app).post(`/api/disbursement/loans/${b.loanId}/reject`).set('Cookie', cookie).send({ category: 'KYC', note: 'PAN name mismatch' }).expect(200);

    const res = await request(app).get('/api/disbursement/decisions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.loans.map((l: { id: string }) => [l.id, l]));
    expect(byId[a.loanId].decision).toMatchObject({ outcome: 'DISBURSED', by: { name: 'Dev Rao' }, reference: 'NEFT123456', note: 'HDFC' });
    expect(byId[b.loanId].decision).toMatchObject({ outcome: 'REJECTED', reason: 'KYC verification failed', note: 'PAN name mismatch' });
    expect(res.body.counts).toEqual({ approved: 1, rejected: 1 });
  });

  it('searches decided loans by applicant', async () => {
    const a = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    await request(app).post(`/api/sanction/loans/${a.loanId}/approve`).set('Cookie', cookie).expect(200);
    expect((await request(app).get('/api/sanction/decisions?q=nobody-matches-this').set('Cookie', cookie)).body.loans).toHaveLength(0);
  });

  it('is only open to the stage that made the decisions', async () => {
    const collection = await loginAs(app, 'COLLECTION');
    const sales = await loginAs(app, 'SALES');
    expect((await request(app).get('/api/sanction/decisions').set('Cookie', collection.cookie)).status).toBe(403);
    expect((await request(app).get('/api/disbursement/decisions').set('Cookie', sales.cookie)).status).toBe(403);
    expect((await request(app).get('/api/sanction/decisions')).status).toBe(401);
  });
});
