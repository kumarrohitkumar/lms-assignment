import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Loan } from '../src/models/Loan';
import { prepareBorrower, validProfile } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

async function readyBorrower() {
  const session = await loginAs(app, 'BORROWER');
  await prepareBorrower(app, session.cookie);
  return session;
}

describe('POST /api/borrower/loans', () => {
  it('creates an APPLIED loan with server-computed simple interest', async () => {
    const { cookie } = await readyBorrower();
    const res = await request(app)
      .post('/api/borrower/loans')
      .set('Cookie', cookie)
      // client-supplied interest is ignored
      .send({ principal: 50000, tenureDays: 30, simpleInterest: 1, totalRepayment: 1 });

    expect(res.status).toBe(201);
    expect(res.body.loan).toMatchObject({
      status: 'APPLIED',
      principal: 50000,
      tenureDays: 30,
      interestRatePa: 12,
      simpleInterest: 493.15,
      totalRepayment: 50493.15,
      amountPaid: 0,
      outstanding: 50493.15,
      applicant: { fullName: 'Asha Rao', pan: 'ABCPE1234F', monthlySalary: 60000, employmentMode: 'SALARIED' },
      salarySlip: { originalName: 'slip.pdf', mimeType: 'application/pdf' },
    });
    expect(res.body.loan.statusHistory).toEqual([
      expect.objectContaining({ from: null, to: 'APPLIED', at: expect.any(String) }),
    ]);
  });

  it.each([
    ['principal below ₹50,000', { principal: 49999, tenureDays: 30 }],
    ['principal above ₹5,00,000', { principal: 500001, tenureDays: 30 }],
    ['tenure below 30 days', { principal: 100000, tenureDays: 29 }],
    ['tenure above 365 days', { principal: 100000, tenureDays: 366 }],
    ['fractional tenure', { principal: 100000, tenureDays: 30.5 }],
    ['missing fields', {}],
  ])('rejects %s with 400', async (_label, body) => {
    const { cookie } = await readyBorrower();
    expect((await request(app).post('/api/borrower/loans').set('Cookie', cookie).send(body)).status).toBe(400);
  });

  it('requires a passed BRE', async () => {
    const { cookie } = await loginAs(app, 'BORROWER');
    const res = await request(app).post('/api/borrower/loans').set('Cookie', cookie).send({ principal: 100000, tenureDays: 90 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BRE_NOT_PASSED');
  });

  it('requires a salary slip', async () => {
    const { cookie } = await loginAs(app, 'BORROWER');
    await request(app).put('/api/borrower/profile').set('Cookie', cookie).send(validProfile).expect(200);
    const res = await request(app).post('/api/borrower/loans').set('Cookie', cookie).send({ principal: 100000, tenureDays: 90 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SALARY_SLIP_REQUIRED');
  });

  it('allows only one open loan at a time, but a new one after rejection', async () => {
    const { cookie } = await readyBorrower();
    const first = await request(app).post('/api/borrower/loans').set('Cookie', cookie).send({ principal: 100000, tenureDays: 90 });
    const second = await request(app).post('/api/borrower/loans').set('Cookie', cookie).send({ principal: 100000, tenureDays: 90 });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('OPEN_LOAN_EXISTS');

    await Loan.updateOne({ _id: first.body.loan.id }, { status: 'REJECTED' });
    const third = await request(app).post('/api/borrower/loans').set('Cookie', cookie).send({ principal: 75000, tenureDays: 60 });
    expect(third.status).toBe(201);
  });

  it('blocks editing details or the slip while a loan is open', async () => {
    const { cookie } = await readyBorrower();
    await request(app).post('/api/borrower/loans').set('Cookie', cookie).send({ principal: 100000, tenureDays: 90 }).expect(201);
    const res = await request(app).put('/api/borrower/profile').set('Cookie', cookie).send(validProfile);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OPEN_LOAN_EXISTS');
  });
});

describe('GET /api/borrower/loans', () => {
  it("returns only the caller's loans, newest first", async () => {
    const a = await readyBorrower();
    const b = await readyBorrower();
    await request(app).post('/api/borrower/loans').set('Cookie', a.cookie).send({ principal: 100000, tenureDays: 90 }).expect(201);
    await request(app).post('/api/borrower/loans').set('Cookie', b.cookie).send({ principal: 200000, tenureDays: 180 }).expect(201);

    const res = await request(app).get('/api/borrower/loans').set('Cookie', a.cookie);
    expect(res.status).toBe(200);
    expect(res.body.loans).toHaveLength(1);
    expect(res.body.loans[0].principal).toBe(100000);
  });
});
