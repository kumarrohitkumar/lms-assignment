import { Readable } from 'node:stream';
import { notFound } from '../lib/errors';
import type { StorageDriver } from './StorageDriver';

/** Test double: keeps files in a Map. With `direct: true` it also behaves like S3's browser uploads. */
export function createMemoryStorage({ direct = false } = {}): StorageDriver & { files: Map<string, Buffer> } {
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
    direct: direct
      ? {
          async createTarget(key, { contentType, maxBytes }) {
            return { url: 'https://storage.test/upload', fields: { key, 'Content-Type': contentType, maxBytes: String(maxBytes) } };
          },
          async size(key) {
            return files.get(key)?.length ?? null;
          },
          async readStart(key, bytes) {
            return (files.get(key) ?? Buffer.alloc(0)).subarray(0, bytes);
          },
          async remove(key) {
            files.delete(key);
          },
        }
      : undefined,
  };
}
