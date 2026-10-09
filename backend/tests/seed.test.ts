import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../src/lib/roles';
import { User } from '../src/models/User';
import { SEED_ACCOUNTS, SEED_PASSWORD, seedUsers } from '../src/scripts/seedUsers';
import { buildTestApp } from './helpers';

describe('seed script', () => {
  it('creates exactly one account per role and is safe to run twice', async () => {
    await seedUsers();
    await seedUsers();

    expect(await User.countDocuments()).toBe(ROLES.length);
    for (const role of ROLES) expect(await User.countDocuments({ role })).toBe(1);
  });

  it('every seeded account can log in with the documented password', async () => {
    await seedUsers();
    const app = buildTestApp();
    for (const account of SEED_ACCOUNTS) {
      const res = await request(app).post('/api/auth/login').send({ email: account.email, password: SEED_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(account.role);
    }
  });
});
