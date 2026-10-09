import type { Express } from 'express';
import request from 'supertest';

export const validProfile = {
  fullName: 'Asha Rao',
  pan: 'abcpe1234f',
  dateOfBirth: '1995-05-20',
  monthlySalary: 60000,
  employmentMode: 'SALARIED',
};

export const PDF_BYTES = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(200, 32)]);
export const PNG_BYTES = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
export const JPG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);

/** Drives a borrower through details + slip so they are ready to apply. */
export async function prepareBorrower(app: Express, cookie: string) {
  await request(app).put('/api/borrower/profile').set('Cookie', cookie).send(validProfile).expect(200);
  await request(app)
    .post('/api/borrower/salary-slip')
    .set('Cookie', cookie)
    .attach('file', PDF_BYTES, { filename: 'slip.pdf', contentType: 'application/pdf' })
    .expect(201);
}

/** A fresh borrower with an APPLIED loan. */
export async function createAppliedLoan(
  app: Express,
  loginAs: (app: Express, role: 'BORROWER') => Promise<{ cookie: string; user: { _id: unknown } }>,
  loan = { principal: 100000, tenureDays: 365 },
) {
  const borrower = await loginAs(app, 'BORROWER');
  await prepareBorrower(app, borrower.cookie);
  const res = await request(app).post('/api/borrower/loans').set('Cookie', borrower.cookie).send(loan).expect(201);
  return { borrower, loanId: res.body.loan.id as string };
}
