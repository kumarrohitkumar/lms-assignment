import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { User } from '../src/models/User';
import { buildTestApp, createUser, TEST_PASSWORD } from './helpers';

const app = buildTestApp();

describe('GET /api/auth/me (my account)', () => {
  it('returns my name, email, role, when I joined and when I last logged in', async () => {
    const user = await createUser('SANCTION', { name: 'Sana Iyer', email: 'sana@lms.dev' });
    const before = Date.now();
    const login = await request(app).post('/api/auth/login').send({ email: 'sana@lms.dev', password: TEST_PASSWORD });
    const cookie = login.headers['set-cookie']![0]!.split(';')[0]!;

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: String(user._id),
      name: 'Sana Iyer',
      email: 'sana@lms.dev',
      role: 'SANCTION',
      createdAt: expect.any(String),
      lastLoginAt: expect.any(String),
    });
    expect(new Date(res.body.user.lastLoginAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('records the login time on every login, including right after sign-up', async () => {
    const signup = await request(app).post('/api/auth/register').send({ name: 'New Person', email: 'new@example.com', password: 'Secret@123' });
    expect(signup.body.user.lastLoginAt).toEqual(expect.any(String));
    const stored = await User.findOne({ email: 'new@example.com' });
    expect(stored!.lastLoginAt).toBeInstanceOf(Date);
  });

  it('a failed login does not change the last login time', async () => {
    const user = await createUser('ADMIN', { email: 'boss@lms.dev' });
    await request(app).post('/api/auth/login').send({ email: 'boss@lms.dev', password: 'wrong-password' });
    const stored = await User.findById(user._id);
    expect(stored!.lastLoginAt ?? null).toBeNull();
  });
});
