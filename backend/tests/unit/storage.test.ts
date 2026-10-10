import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { text } from 'node:stream/consumers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../../src/config/env';
import { createStorage } from '../../src/storage';
import { createLocalStorage } from '../../src/storage/localStorage';

describe('local storage driver', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'lms-storage-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('saves a file under nested keys and streams it back', async () => {
    const storage = createLocalStorage(dir);
    await storage.save('salary-slips/u1/a.pdf', Buffer.from('%PDF-hello'), 'application/pdf');
    expect(await text(await storage.getStream('salary-slips/u1/a.pdf'))).toBe('%PDF-hello');
  });

  it('refuses keys that escape the upload directory', async () => {
    const storage = createLocalStorage(dir);
    await expect(storage.save('../evil.txt', Buffer.from('x'), 'text/plain')).rejects.toThrow(/Invalid storage key/);
    await expect(storage.getStream('/etc/passwd')).rejects.toThrow(/Invalid storage key/);
  });

  it('returns 404 for a missing file', async () => {
    await expect(createLocalStorage(dir).getStream('missing.pdf')).rejects.toMatchObject({ status: 404 });
  });
});

describe('createStorage', () => {
  const base: Env = {
    NODE_ENV: 'test', PORT: 4000, CORS_ORIGINS: [], TRUST_PROXY_HOPS: 1, MONGO_URI: 'x', JWT_SECRET: 'x'.repeat(8),
    JWT_EXPIRES_IN: '1d', STORAGE_DRIVER: 'local', UPLOAD_DIR: 'uploads', AWS_REGION: 'ap-south-1',
    S3_BUCKET: undefined, S3_REGION: undefined, S3_ACCESS_KEY_ID: undefined, S3_SECRET_ACCESS_KEY: undefined,
  };

  it('requires a bucket for the S3 driver', () => {
    expect(() => createStorage({ ...base, STORAGE_DRIVER: 's3' })).toThrow(/S3_BUCKET/);
  });

  it('builds an S3 driver from S3_* settings (Vercel reserves the AWS_* names)', () => {
    const storage = createStorage({
      ...base, STORAGE_DRIVER: 's3', S3_BUCKET: 'b', S3_REGION: 'eu-west-1', S3_ACCESS_KEY_ID: 'id', S3_SECRET_ACCESS_KEY: 'secret',
    });
    expect(storage).toHaveProperty('save');
  });

  it('rejects half-configured S3 credentials', () => {
    expect(() => createStorage({ ...base, STORAGE_DRIVER: 's3', S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'id' })).toThrow(/S3_SECRET_ACCESS_KEY/);
  });
});
