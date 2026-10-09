import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { notFound } from '../lib/errors';
import type { StorageDriver } from './StorageDriver';

/** Stores files in a private S3 bucket. Credentials come from the standard AWS env vars / instance role. */
export function createS3Storage({ bucket, region }: { bucket: string; region: string }): StorageDriver {
  const client = new S3Client({ region });

  return {
    async save(key, data, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType, ServerSideEncryption: 'AES256' }),
      );
    },
    async getStream(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return res.Body as Readable;
      } catch (err) {
        if (err instanceof NoSuchKey) throw notFound('File');
        throw err;
      }
    },
  };
}
