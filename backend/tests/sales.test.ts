import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAppliedLoan, validProfile } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const app = buildTestApp();

describe('sales module (lead tracking)', () => {
  it('lists registered borrowers who have not applied, with their stage', async () => {
    await loginAs(app, 'BORROWER', { name: 'Just Registered' });

    const failed = await loginAs(app, 'BORROWER', { name: 'Failed BRE' });
    await request(app).put('/api/borrower/profile').set('Cookie', failed.cookie).send({ ...validProfile, employmentMode: 'UNEMPLOYED' });

    const details = await loginAs(app, 'BORROWER', { name: 'Has Details' });
    await request(app).put('/api/borrower/profile').set('Cookie', details.cookie).send(validProfile);

    await createAppliedLoan(app, loginAs); // already applied → not a lead
    await loginAs(app, 'SANCTION'); // staff → not a lead

    const { cookie } = await loginAs(app, 'SALES');
    const res = await request(app).get('/api/sales/leads').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const byName = Object.fromEntries(res.body.leads.map((l: { name: string }) => [l.name, l]));
    expect(Object.keys(byName).sort()).toEqual(['Failed BRE', 'Has Details', 'Just Registered']);
    expect(byName['Just Registered']).toMatchObject({ stage: 'REGISTERED', profile: null });
    expect(byName['Failed BRE']).toMatchObject({
      stage: 'BRE_FAILED',
      profile: { monthlySalary: 60000, breFailures: ['Unemployed applicants are not eligible for a loan.'] },
    });
    expect(byName['Has Details'].stage).toBe('DETAILS_SUBMITTED');
    expect(res.body.leads[0]).toHaveProperty('registeredAt');
  });

  it('allows ADMIN, forbids other roles', async () => {
    expect((await request(app).get('/api/sales/leads').set('Cookie', (await loginAs(app, 'ADMIN')).cookie)).status).toBe(200);
    for (const role of ['SANCTION', 'DISBURSEMENT', 'COLLECTION', 'BORROWER'] as const) {
      const { cookie } = await loginAs(app, role);
      expect((await request(app).get('/api/sales/leads').set('Cookie', cookie)).status).toBe(403);
    }
  });
});
