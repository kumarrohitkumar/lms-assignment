import 'dotenv/config';
import { z } from 'zod';

const optionalString = z.string().optional().transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  MONGO_URI: z.string().default('mongodb://localhost:27017/lms'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  S3_BUCKET: optionalString,
  /** S3_* take precedence; the AWS_* names also work where the host doesn't reserve them (Vercel does). */
  S3_REGION: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  AWS_REGION: z.string().default('ap-south-1'),
});

const productionSafe = schema.refine(
  (e) => e.NODE_ENV !== 'production' || (e.JWT_SECRET.length >= 32 && !e.JWT_SECRET.startsWith('change-me')),
  { message: 'In production JWT_SECRET must be a random string of at least 32 characters', path: ['JWT_SECRET'] },
);

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parsed lazily so tests can set process.env before first use. */
export function env(): Env {
  if (!cached) {
    const parsed = productionSafe.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}
