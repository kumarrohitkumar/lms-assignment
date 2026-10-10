import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEV_JWT_SECRET, parseEnv } from '../src/config/env';
import { User } from '../src/models/User';
import { SEED_ACCOUNTS, seedIfEmpty } from '../src/scripts/seedUsers';

const example = Object.fromEntries(
  readFileSync(path.join(__dirname, '../.env.example'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

describe('.env.example works as-is for local runs', () => {
  it('ships the development secret, so copying the file is enough', () => {
    expect(example.JWT_SECRET).toBe(DEV_JWT_SECRET);
    expect(() => parseEnv({ ...example, NODE_ENV: 'development' })).not.toThrow();
  });

  it('defaults to local MongoDB and local disk, so no cloud account is needed', () => {
    const env = parseEnv({ ...example, NODE_ENV: 'development' });
    expect(env.MONGO_URI).toBe('mongodb://localhost:27017/lms');
    expect(env.STORAGE_DRIVER).toBe('local');
  });

  it('refuses to start in production with the development secret', () => {
    expect(() => parseEnv({ ...example, NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => parseEnv({ ...example, NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) })).not.toThrow();
  });
});

describe('seedIfEmpty (first local start)', () => {
  it('creates the role accounts when the database has no users', async () => {
    expect(await seedIfEmpty()).toBe(true);
    expect(await User.countDocuments()).toBe(SEED_ACCOUNTS.length);
  });

  it('does nothing once any user exists', async () => {
    await User.create({ name: 'Someone', email: 'someone@test.dev', passwordHash: 'x', role: 'BORROWER' });
    expect(await seedIfEmpty()).toBe(false);
    expect(await User.countDocuments()).toBe(1);
  });
});
