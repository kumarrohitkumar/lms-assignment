import { Readable } from 'node:stream';
import { notFound } from '../lib/errors';
import type { StorageDriver } from './StorageDriver';

/** Test double: keeps files in a Map. */
export function createMemoryStorage(): StorageDriver & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    async save(key, data) {
      files.set(key, data);
    },
    async getStream(key) {
      const data = files.get(key);
      if (!data) throw notFound('File');
      return Readable.from(data);
    },
  };
}
