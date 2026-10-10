import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAppliedLoan } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

async function sanctioned() {
  const created = await createAppliedLoan(app, loginAs);
  const { cookie } = await loginAs(app, 'SANCTION');
  await request(app).post(`/api/sanction/loans/${created.loanId}/approve`).set('Cookie', cookie).send({ remark: 'Slip matches declared salary' }).expect(200);
  return created;
}

describe('eligibility snapshot (what was checked)', () => {
  it('stores every check with the value that was checked when the loan is applied for', async () => {
    const { borrower } = await createAppliedLoan(app, loginAs);
    const res = await request(app).get('/api/borrower/loans').set('Cookie', borrower.cookie);
    const checks = res.body.loans[0].eligibility;
    expect(checks.map((c: { rule: string }) => c.rule)).toEqual(['AGE', 'SALARY', 'PAN', 'EMPLOYMENT', 'SALARY_SLIP']);
    expect(checks.every((c: { passed: boolean }) => c.passed)).toBe(true);
    expect(checks.find((c: { rule: string }) => c.rule === 'SALARY').detail).toBe('₹60,000 a month (minimum ₹25,000)');
    expect(checks.find((c: { rule: string }) => c.rule === 'PAN').detail).toBe('ABCPE1234F is a valid PAN');
    expect(checks.find((c: { rule: string }) => c.rule === 'SALARY_SLIP').detail).toBe('slip.pdf uploaded');
  });
});

describe('sanction decisions', () => {
  it('records an approval remark in the history', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    const res = await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', cookie).send({ remark: 'Verified with employer' });
    expect(res.status).toBe(200);
    expect(res.body.loan.statusHistory.at(-1)).toMatchObject({ to: 'SANCTIONED', note: 'Verified with employer' });
  });

  it('rejects with a category and note, visible to the borrower', async () => {
    const { loanId, borrower } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    const res = await request(app)
      .post(`/api/sanction/loans/${loanId}/reject`)
      .set('Cookie', cookie)
      .send({ category: 'INCOME_MISMATCH', note: 'Slip shows ₹32,000, declared ₹60,000' });

    expect(res.status).toBe(200);
    expect(res.body.loan).toMatchObject({
      status: 'REJECTED',
      rejection: {
        stage: 'SANCTION',
        category: 'INCOME_MISMATCH',
        categoryLabel: "Income on the salary slip doesn't match the declared salary",
        note: 'Slip shows ₹32,000, declared ₹60,000',
        at: expect.any(String),
      },
      rejectionReason: "Income on the salary slip doesn't match the declared salary — Slip shows ₹32,000, declared ₹60,000",
    });
    const own = await request(app).get('/api/borrower/loans').set('Cookie', borrower.cookie);
    expect(own.body.loans[0].rejection.categoryLabel).toMatch(/Income/);
  });

  it('allows a category without a note, but OTHER needs a note', async () => {
    const a = await createAppliedLoan(app, loginAs);
    const b = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    expect((await request(app).post(`/api/sanction/loans/${a.loanId}/reject`).set('Cookie', cookie).send({ category: 'SLIP_UNREADABLE' })).status).toBe(200);
    expect((await request(app).post(`/api/sanction/loans/${b.loanId}/reject`).set('Cookie', cookie).send({ category: 'OTHER' })).status).toBe(400);
    expect((await request(app).post(`/api/sanction/loans/${b.loanId}/reject`).set('Cookie', cookie).send({ category: 'NOT_A_CATEGORY', note: 'x y z' })).status).toBe(400);
  });

  it('still accepts the original { reason } body', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const { cookie } = await loginAs(app, 'SANCTION');
    const res = await request(app).post(`/api/sanction/loans/${loanId}/reject`).set('Cookie', cookie).send({ reason: 'Documents incomplete' });
    expect(res.body.loan).toMatchObject({ status: 'REJECTED', rejection: { category: 'OTHER', note: 'Documents incomplete' } });
  });

  it('lists the rejection categories for each stage', async () => {
    const { cookie } = await loginAs(app, 'SANCTION');
    const res = await request(app).get('/api/decisions/rejection-categories').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.SANCTION.map((c: { value: string }) => c.value)).toContain('INCOME_MISMATCH');
    expect(res.body.DISBURSEMENT.map((c: { value: string }) => c.value)).toContain('BANK_DETAILS');
  });
});

describe('disbursement decisions', () => {
  it('requires the bank transfer reference to disburse and records it', async () => {
    const { loanId } = await sanctioned();
    const { cookie } = await loginAs(app, 'DISBURSEMENT');
    expect((await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', cookie).send({})).status).toBe(400);
    const res = await request(app)
      .post(`/api/disbursement/loans/${loanId}/disburse`)
      .set('Cookie', cookie)
      .send({ reference: 'neft2610abc123', remark: 'Sent to HDFC ****1234' });
    expect(res.status).toBe(200);
    expect(res.body.loan).toMatchObject({ status: 'DISBURSED', disbursement: { reference: 'NEFT2610ABC123', remark: 'Sent to HDFC ****1234' } });
  });

  it('can reject a sanctioned loan with a reason (e.g. bank details failed)', async () => {
    const { loanId, borrower } = await sanctioned();
    const { cookie } = await loginAs(app, 'DISBURSEMENT');
    const res = await request(app)
      .post(`/api/disbursement/loans/${loanId}/reject`)
      .set('Cookie', cookie)
      .send({ category: 'BANK_DETAILS', note: 'Penny drop failed twice' });
    expect(res.status).toBe(200);
    expect(res.body.loan).toMatchObject({ status: 'REJECTED', rejection: { stage: 'DISBURSEMENT', category: 'BANK_DETAILS' } });
    expect(res.body.loan.statusHistory.at(-1)).toMatchObject({ from: 'SANCTIONED', to: 'REJECTED' });

    // A rejected borrower may apply again
    const again = await request(app).post('/api/borrower/loans').set('Cookie', borrower.cookie).send({ principal: 60000, tenureDays: 30 });
    expect(again.status).toBe(201);
  });

  it('only disbursement staff (or admin) can reject at this stage, and only sanctioned loans', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const disb = await loginAs(app, 'DISBURSEMENT');
    expect((await request(app).post(`/api/disbursement/loans/${loanId}/reject`).set('Cookie', disb.cookie).send({ category: 'KYC' })).status).toBe(409);
    const sanctionedLoan = await sanctioned();
    const sanctionUser = await loginAs(app, 'SANCTION');
    expect((await request(app).post(`/api/disbursement/loans/${sanctionedLoan.loanId}/reject`).set('Cookie', sanctionUser.cookie).send({ category: 'KYC' })).status).toBe(403);
  });
});
