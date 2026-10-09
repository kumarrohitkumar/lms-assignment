import type { Env } from '../config/env';
import { createLocalStorage } from './localStorage';
import { createS3Storage } from './s3Storage';
import type { StorageDriver } from './StorageDriver';

export function createStorage(config: Env): StorageDriver {
  if (config.STORAGE_DRIVER === 's3') {
    if (!config.S3_BUCKET) throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3');
    return createS3Storage({ bucket: config.S3_BUCKET, region: config.AWS_REGION });
  }
  return createLocalStorage(config.UPLOAD_DIR);
}

export type { StorageDriver } from './StorageDriver';
