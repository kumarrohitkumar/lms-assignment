import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, NoSuchKey, NotFound, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type { Readable } from 'node:stream';
import { notFound } from '../lib/errors';
import type { StorageDriver } from './StorageDriver';

interface S3Options {
  bucket: string;
  region: string;
  /** Explicit keys; when omitted the SDK's default chain is used (AWS_* env vars, profile, instance role). */
  credentials?: { accessKeyId: string; secretAccessKey: string };
}

/** Stores files in a private S3 bucket. */
export function createS3Storage({ bucket, region, credentials }: S3Options): StorageDriver {
  const client = new S3Client({ region, credentials });

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
    direct: {
      async createTarget(key, { contentType, maxBytes }) {
        const { url, fields } = await createPresignedPost(client, {
          Bucket: bucket,
          Key: key,
          Conditions: [
            ['content-length-range', 1, maxBytes],
            ['eq', '$Content-Type', contentType],
          ],
          Fields: { 'Content-Type': contentType },
          Expires: 300,
        });
        return { url, fields };
      },
      async size(key) {
        try {
          const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
          return head.ContentLength ?? 0;
        } catch (err) {
          if (err instanceof NotFound || err instanceof NoSuchKey) return null;
          throw err;
        }
      },
      async readStart(key, bytes) {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
        return Buffer.from(await res.Body!.transformToByteArray());
      },
      async remove(key) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      },
    },
  };
}
