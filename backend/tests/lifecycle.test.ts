import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { seedUsers, SEED_PASSWORD } from '../src/scripts/seedUsers';
import { PDF_BYTES, validProfile } from './fixtures';
import { buildTestApp } from './helpers';

const app = buildTestApp();
const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

async function login(email: string, password = SEED_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.headers['set-cookie']![0]!.split(';')[0]!;
}

describe('end-to-end loan lifecycle with seeded staff', () => {
  it('borrower applies (BRE fail then pass) → sanctioned → disbursed → repaid → closed', async () => {
    await seedUsers();

    // Borrower signs up
    const signup = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ravi Kumar', email: 'ravi@example.com', password: 'Secret@123' })
      .expect(201);
    const borrower = signup.headers['set-cookie']![0]!.split(';')[0]!;

    // BRE fails, then passes
    await request(app).put('/api/borrower/profile').set('Cookie', borrower).send({ ...validProfile, monthlySalary: 15000 }).expect(422);
    await request(app).put('/api/borrower/profile').set('Cookie', borrower).send(validProfile).expect(200);

    // Sales sees the lead before they apply
    const sales = await login('sales@lms.dev');
    const leads = await request(app).get('/api/sales/leads').set('Cookie', sales).expect(200);
    expect(leads.body.leads.map((l: { email: string }) => l.email)).toContain('ravi@example.com');

    // Slip + apply: ₹2,00,000 for 180 days → SI = 200000 × 12 × 180 / 36500 = ₹11,835.62
    await request(app)
      .post('/api/borrower/salary-slip')
      .set('Cookie', borrower)
      .attach('file', PDF_BYTES, { filename: 'slip.pdf', contentType: 'application/pdf' })
      .expect(201);
    const applied = await request(app).post('/api/borrower/loans').set('Cookie', borrower).send({ principal: 200000, tenureDays: 180 }).expect(201);
    const loanId = applied.body.loan.id;
    expect(applied.body.loan).toMatchObject({ simpleInterest: 11835.62, totalRepayment: 211835.62 });

    // No longer a lead
    const leadsAfter = await request(app).get('/api/sales/leads').set('Cookie', sales).expect(200);
    expect(leadsAfter.body.leads.map((l: { email: string }) => l.email)).not.toContain('ravi@example.com');

    // Sanction → disbursement
    await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', await login('sanction@lms.dev')).expect(200);
    await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', await login('disbursement@lms.dev')).send({ reference: 'NEFT00000001' }).expect(200);

    // Collection: two payments settle the loan
    const collection = await login('collection@lms.dev');
    const first = await request(app)
      .post(`/api/collection/loans/${loanId}/payments`)
      .set('Cookie', collection)
      .send({ utr: 'HDFC00000000001', amount: 100000, paymentDate: today })
      .expect(201);
    expect(first.body.loan).toMatchObject({ status: 'DISBURSED', outstanding: 111835.62 });

    const last = await request(app)
      .post(`/api/collection/loans/${loanId}/payments`)
      .set('Cookie', collection)
      .send({ utr: 'HDFC00000000002', amount: 111835.62, paymentDate: today })
      .expect(201);
    expect(last.body.loan).toMatchObject({ status: 'CLOSED', outstanding: 0 });
    expect(last.body.loan.statusHistory.map((h: { to: string }) => h.to)).toEqual(['APPLIED', 'SANCTIONED', 'DISBURSED', 'CLOSED']);

    // Borrower sees it closed and may apply again
    const mine = await request(app).get('/api/borrower/loans').set('Cookie', borrower).expect(200);
    expect(mine.body.loans[0].status).toBe('CLOSED');
  });
});
