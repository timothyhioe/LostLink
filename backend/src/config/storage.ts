import { Client as MinioClient } from "minio";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

export type StorageClient = MinioClient | S3Client;

export interface StorageConfig {
  client: StorageClient;
  bucket: string;
  type: "minio" | "s3";
  region?: string;
}

function createStorageConfig(): StorageConfig {
  if (env.STORAGE_TYPE === "s3") {
    // AWS S3 configuration
    const s3Config: any = {
      region: env.AWS_REGION,
    };

    // Only add credentials if provided (otherwise use IAM role)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      };
    }

    const s3Client = new S3Client(s3Config);

    return {
      client: s3Client,
      bucket: env.AWS_S3_BUCKET,
      type: "s3",
      region: env.AWS_REGION,
    };
  } else {
    // MinIO configuration (development)
    const minioClient = new MinioClient({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });

    return {
      client: minioClient,
      bucket: env.MINIO_BUCKET,
      type: "minio",
    };
  }
}

export const storageConfig = createStorageConfig();

// Keep backward compatibility for existing code
export const minioClient =
  storageConfig.type === "minio" ? (storageConfig.client as MinioClient) : null;

export async function ensureBucketExists(): Promise<void> {
  if (storageConfig.type === "minio" && minioClient) {
    const exists = await minioClient
      .bucketExists(storageConfig.bucket)
      .catch(() => false);
    if (!exists) {
      await minioClient.makeBucket(storageConfig.bucket, "");
    }
  }
  // For S3, bucket should already exist (created via CLI)
}
