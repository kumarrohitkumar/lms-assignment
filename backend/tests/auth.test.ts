import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { User } from '../src/models/User';
import { buildTestApp, createUser, loginAs } from './helpers';

const app = buildTestApp();
const signup = { name: 'Asha Rao', email: 'Asha@Example.com', password: 'Secret@123' };

describe('POST /api/auth/register', () => {
  it('creates a borrower, hashes the password and sets an httpOnly cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...signup, role: 'ADMIN' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Asha Rao', email: 'asha@example.com', role: 'BORROWER' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/lms_token=.+; .*HttpOnly/);

    const stored = await User.findOne({ email: 'asha@example.com' }).select('+passwordHash');
    expect(stored!.passwordHash).not.toBe(signup.password);
    expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(signup);
    const res = await request(app).post('/api/auth/register').send({ ...signup, email: 'asha@example.com' });
    expect(res.status).toBe(409);
  });

  it.each([
    ['missing name', { ...signup, name: '' }],
    ['bad email', { ...signup, email: 'nope' }],
    ['short password', { ...signup, password: 'abc' }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials (email is case-insensitive)', async () => {
    await createUser('SANCTION', { email: 'sanction@lms.dev', password: 'Password@123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'SANCTION@lms.dev', password: 'Password@123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('SANCTION');
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.headers['set-cookie']?.[0]).toMatch(/lms_token=/);
  });

  it('returns 401 for a wrong password or unknown email', async () => {
    await createUser('BORROWER', { email: 'b@lms.dev', password: 'Password@123' });
    expect((await request(app).post('/api/auth/login').send({ email: 'b@lms.dev', password: 'wrong-pass' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'x@lms.dev', password: 'Password@123' })).status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 for a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('accepts the cookie and the Bearer header', async () => {
    const { cookie, token } = await loginAs(app, 'COLLECTION');
    const viaCookie = await request(app).get('/api/auth/me').set('Cookie', cookie);
    const viaBearer = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(viaCookie.status).toBe(200);
    expect(viaCookie.body.user.role).toBe('COLLECTION');
    expect(viaBearer.status).toBe(200);
  });

  it('returns 401 if the user was deleted after the token was issued', async () => {
    const { cookie, user } = await loginAs(app, 'SALES');
    await User.deleteOne({ _id: user._id });
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie']?.[0]).toMatch(/lms_token=;/);
  });
});
