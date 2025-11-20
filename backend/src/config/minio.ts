import { Client } from 'minio';

import { env } from './env';

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY
});

export async function ensureBucketExists(): Promise<void> {
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET, '');
  }
}

