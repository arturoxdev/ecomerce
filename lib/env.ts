import "server-only";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  STORE_ID: z.string().min(1, "STORE_ID is required"),

  S3_ENDPOINT: z.string().url("S3_ENDPOINT must be a valid URL"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID is required"),
  S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY is required"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_PUBLIC_URL: z.string().url("S3_PUBLIC_URL must be a valid URL"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = parseEnv();
