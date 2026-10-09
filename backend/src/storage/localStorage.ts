import { createReadStream } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from '../lib/errors';
import type { StorageDriver } from './StorageDriver';

/** Stores files on disk under `rootDir`. Fine for local runs; use S3 on hosts with ephemeral disks. */
export function createLocalStorage(rootDir: string): StorageDriver {
  const root = path.resolve(rootDir);

  function resolveKey(key: string): string {
    const full = path.resolve(root, key);
    if (path.isAbsolute(key) || !full.startsWith(root + path.sep)) throw new Error('Invalid storage key');
    return full;
  }

  return {
    async save(key, data) {
      const full = resolveKey(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, data);
    },
    async getStream(key) {
      const full = resolveKey(key);
      try {
        await access(full);
      } catch {
        throw notFound('File');
      }
      return createReadStream(full);
    },
  };
}
