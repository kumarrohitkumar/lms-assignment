import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAppliedLoan, PDF_BYTES } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

describe('GET /api/loans/:id/salary-slip', () => {
  it('streams the file to the owner and to loan-handling staff', async () => {
    const { loanId, borrower } = await createAppliedLoan(app, loginAs);
    for (const cookie of [borrower.cookie, (await loginAs(app, 'SANCTION')).cookie, (await loginAs(app, 'ADMIN')).cookie]) {
      const res = await request(app).get(`/api/loans/${loanId}/salary-slip`).set('Cookie', cookie).buffer(true);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('slip.pdf');
      expect(Buffer.from(res.body)).toEqual(PDF_BYTES);
    }
  });

  it("forbids another borrower and the sales team", async () => {
    const { loanId } = await createAppliedLoan(app, loginAs);
    const other = await loginAs(app, 'BORROWER');
    expect((await request(app).get(`/api/loans/${loanId}/salary-slip`).set('Cookie', other.cookie)).status).toBe(403);
    const sales = await loginAs(app, 'SALES');
    expect((await request(app).get(`/api/loans/${loanId}/salary-slip`).set('Cookie', sales.cookie)).status).toBe(403);
  });
});
