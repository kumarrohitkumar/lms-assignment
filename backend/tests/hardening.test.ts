import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { evaluateBre } from '../src/lib/bre';
import { createMemoryStorage } from '../src/storage/memoryStorage';
import { Loan } from '../src/models/Loan';
import { Payment } from '../src/models/Payment';
import { createAppliedLoan, validProfile } from './fixtures';
import { buildTestApp, createUser, loginAs, TEST_PASSWORD } from './helpers';

const app = buildTestApp();

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('BRE uses the Indian calendar date', () => {
  it('treats 01:30 IST on the 23rd birthday as age 23 (UTC is still the day before)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T20:00:00Z')); // 10 Oct 2026, 01:30 IST
    const result = evaluateBre({
      pan: 'ABCPE1234F',
      dateOfBirth: new Date('2003-10-10T00:00:00Z'),
      monthlySalary: 50_000_00,
      employmentMode: 'SALARIED',
    });
    expect(result).toEqual({ passed: true, failures: [] });
  });
});

describe('impossible calendar dates are rejected, not rolled over', () => {
  it('rejects a date of birth of 31 February', async () => {
    const { cookie } = await loginAs(app, 'BORROWER');
    const res = await request(app).put('/api/borrower/profile').set('Cookie', cookie).send({ ...validProfile, dateOfBirth: '1999-02-31' });
    expect(res.status).toBe(400);
  });

  it('rejects a payment dated 30 February', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const admin = await loginAs(app, 'ADMIN');
    await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', admin.cookie).expect(200);
    await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', admin.cookie).expect(200);
    const res = await request(app)
      .post(`/api/collection/loans/${loanId}/payments`)
      .set('Cookie', admin.cookie)
      .send({ utr: 'UTR0000000001', amount: 100, paymentDate: '2026-02-30' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('payment recording failure', () => {
  it('removes the payment when the loan update throws, so the UTR is not burnt', async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const admin = await loginAs(app, 'ADMIN');
    await request(app).post(`/api/sanction/loans/${loanId}/approve`).set('Cookie', admin.cookie).expect(200);
    await request(app).post(`/api/disbursement/loans/${loanId}/disburse`).set('Cookie', admin.cookie).expect(200);

    vi.spyOn(Loan, 'findOneAndUpdate').mockImplementationOnce(() => {
      throw new Error('connection reset');
    });
    const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
    const res = await request(app)
      .post(`/api/collection/loans/${loanId}/payments`)
      .set('Cookie', admin.cookie)
      .send({ utr: 'UTR0000000001', amount: 100, paymentDate: today });

    expect(res.status).toBe(500);
    expect(await Payment.countDocuments()).toBe(0);
  });
});

describe('salary slip download filename', () => {
  it('sends an RFC 5987 filename so spaces are not shown as %20', async () => {
    const { loanId, borrower } = await createAppliedLoan(app, loginAs);
    const res = await request(app).get(`/api/loans/${loanId}/salary-slip`).set('Cookie', borrower.cookie);
    expect(res.headers['content-disposition']).toBe(`inline; filename="slip.pdf"; filename*=UTF-8''slip.pdf`);
  });
});

describe('auth cookie', () => {
  it('expires together with the JWT', async () => {
    const user = await createUser('SALES');
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD });
    const cookie = res.headers['set-cookie']![0]!;
    const { exp } = JSON.parse(Buffer.from(res.body.token.split('.')[1], 'base64url').toString());
    expect(cookie).toContain(`Expires=${new Date(exp * 1000).toUTCString()}`);
  });
});

describe('client IP behind proxies', () => {
  it('trusts exactly the configured number of proxy hops (Vercel + Railway = 2)', () => {
    const trust = createApp({ storage: createMemoryStorage(), trustProxyHops: 2 }).get('trust proxy fn');
    expect([0, 1, 2].map((hop) => trust('10.0.0.1', hop))).toEqual([true, true, false]);
  });

  it('defaults to one hop', () => {
    const trust = createApp({ storage: createMemoryStorage() }).get('trust proxy fn');
    expect([0, 1].map((hop) => trust('10.0.0.1', hop))).toEqual([true, false]);
  });
});
