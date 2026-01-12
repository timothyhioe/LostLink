import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(5000),
  POSTGRESQL_URI: z.string().min(1, 'POSTGRESQL_URI is required'),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('change-me-in-production'),
  
  // Storage configuration (MinIO or S3)
  STORAGE_TYPE: z.enum(['minio', 's3']).default('minio'),
  
  // MinIO configuration (development)
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z
    .union([z.string(), z.boolean()])
    .default('false')
    .transform((value) => value === true || value === 'true'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('lostlink-items'),
  
  // AWS S3 configuration (production)
  AWS_REGION: z.string().default('eu-central-1'),
  AWS_S3_BUCKET: z.string().default('lostlink-items-prod'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .union([z.string(), z.boolean()])
    .default('false')
    .transform((value) => value === true || value === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);