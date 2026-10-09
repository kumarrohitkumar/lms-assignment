import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { text } from 'node:stream/consumers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
