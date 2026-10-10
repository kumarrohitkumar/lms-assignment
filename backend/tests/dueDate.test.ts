import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { dueInfo } from '../src/lib/dueDate';
import { Loan } from '../src/models/Loan';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

describe('dueInfo', () => {
  const disbursedAt = new Date('2026-10-01T06:30:00Z'); // 1 Oct 2026, 12:00 IST

  it('is due tenure days after the disbursal date (Indian calendar)', () => {
    expect(dueInfo({ status: 'DISBURSED', disbursedAt, tenureDays: 30 }, '2026-10-21')).toEqual({ dueDate: '2026-10-31', daysToDue: 10, overdue: false });
  });

  it('is not overdue on the due date itself', () => {
    expect(dueInfo({ status: 'DISBURSED', disbursedAt, tenureDays: 30 }, '2026-10-31')).toMatchObject({ daysToDue: 0, overdue: false });
  });

  it('is overdue the day after, counting days late as negative', () => {
    expect(dueInfo({ status: 'DISBURSED', disbursedAt, tenureDays: 30 }, '2026-11-03')).toMatchObject({ daysToDue: -3, overdue: true });
  });

  it('uses the IST date even when disbursed late at night UTC', () => {
    // 30 Sep 2026 20:00 UTC is 1 Oct 01:30 IST
    expect(dueInfo({ status: 'DISBURSED', disbursedAt: new Date('2026-09-30T20:00:00Z'), tenureDays: 30 }, '2026-10-01').dueDate).toBe('2026-10-31');
  });

  it('closed loans keep their due date but are never overdue; undisbursed loans have none', () => {
    expect(dueInfo({ status: 'CLOSED', disbursedAt, tenureDays: 30 }, '2027-01-01')).toMatchObject({ dueDate: '2026-10-31', overdue: false, daysToDue: null });
    expect(dueInfo({ status: 'SANCTIONED', disbursedAt: null, tenureDays: 30 }, '2026-10-21')).toEqual({ dueDate: null, daysToDue: null, overdue: false });
  });
});

async function disbursed(principal = 50000, tenureDays = 30) {
  const { loanId } = await createAppliedLoan(app, loginAs, { principal, tenureDays });
  const admin = await loginAs(app, 'ADMIN');
  await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', admin.cookie).expect(200);
  await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', admin.cookie).send({ reference: 'NEFT00000001' }).expect(200);
  return loanId;
}

describe('due dates in the API', () => {
  it('returns the due date with every disbursed loan', async () => {
    const loanId = await disbursed();
    const { cookie } = await loginAs(app, 'COLLECTION');
    const res = await request(app).get('/api/collection/loans').set('Cookie', cookie);
    const loan = res.body.loans.find((l: { id: string }) => l.id === loanId);
    expect(loan).toMatchObject({ dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), daysToDue: 30, overdue: false });
  });

  it('lists overdue loans first in collection, then by nearest due date', async () => {
    const soon = await disbursed(50000, 60);
    const later = await disbursed(50000, 90);
    const late = await disbursed(50000, 30);
    await Loan.updateOne({ _id: late }, { $set: { disbursedAt: new Date(Date.now() - 40 * 86_400_000) } });
    const { cookie } = await loginAs(app, 'COLLECTION');
    const res = await request(app).get('/api/collection/loans').set('Cookie', cookie);
    expect(res.body.loans.map((l: { id: string }) => l.id)).toEqual([late, soon, later]);
    expect(res.body.loans[0]).toMatchObject({ overdue: true, daysToDue: -10 });
  });

  it('counts overdue loans and amounts in the admin overview', async () => {
    const late = await disbursed(50000, 30);
    await disbursed(60000, 90);
    await Loan.updateOne({ _id: late }, { $set: { disbursedAt: new Date(Date.now() - 40 * 86_400_000) } });
    const admin = await loginAs(app, 'ADMIN');
    const res = await request(app).get('/api/admin/overview').set('Cookie', admin.cookie);
    expect(res.body.overdue).toEqual({ count: 1, outstanding: 50493.15 });
  });
});
