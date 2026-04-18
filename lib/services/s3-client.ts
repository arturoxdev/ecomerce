import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

import { env } from "@/lib/env";

export const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const s3Bucket = env.S3_BUCKET;
export const s3PublicUrl = env.S3_PUBLIC_URL;
