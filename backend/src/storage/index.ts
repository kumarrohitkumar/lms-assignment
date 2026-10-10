import type { Env } from '../config/env';
import { createLocalStorage } from './localStorage';
import { createS3Storage } from './s3Storage';
import type { StorageDriver } from './StorageDriver';

export function createStorage(config: Env): StorageDriver {
  if (config.STORAGE_DRIVER === 's3') {
    if (!config.S3_BUCKET) throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3');
    if (!!config.S3_ACCESS_KEY_ID !== !!config.S3_SECRET_ACCESS_KEY) {
      throw new Error('Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or neither (to use the default AWS credential chain)');
    }
    const credentials =
      config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY }
        : undefined;
    return createS3Storage({ bucket: config.S3_BUCKET, region: config.S3_REGION ?? config.AWS_REGION, credentials });
  }
  return createLocalStorage(config.UPLOAD_DIR);
}

export type { StorageDriver } from './StorageDriver';
