import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import type { Role } from '../src/lib/roles';
import { User } from '../src/models/User';
import { createMemoryStorage } from '../src/storage/memoryStorage';

export const TEST_PASSWORD = 'Password@123';

export function buildTestApp(storage = createMemoryStorage()) {
  return createApp({ storage });
}

let counter = 0;

export async function createUser(role: Role, overrides: { email?: string; password?: string; name?: string } = {}) {
  counter += 1;
  return User.create({
    name: overrides.name ?? `${role} user ${counter}`,
    email: overrides.email ?? `${role.toLowerCase()}${counter}@test.dev`,
    passwordHash: await bcrypt.hash(overrides.password ?? TEST_PASSWORD, 4),
    role,
  });
}

/** Creates a user with the given role and logs in through the API. */
export async function loginAs(app: Express, role: Role, overrides: { name?: string } = {}) {
  const user = await createUser(role, overrides);
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const cookie = res.headers['set-cookie']![0]!.split(';')[0]!;
  return { user, cookie, token: res.body.token as string };
}
