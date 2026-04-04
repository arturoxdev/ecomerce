/**
 * Migrate files from MinIO to Cloudflare R2.
 *
 * Both are S3-compatible, so we use @aws-sdk/client-s3 for both.
 *
 * Required env vars:
 *   SOURCE_S3_ENDPOINT    - MinIO endpoint (e.g. https://festejos-minio.djltpi.easypanel.host)
 *   SOURCE_S3_ACCESS_KEY  - MinIO access key
 *   SOURCE_S3_SECRET_KEY  - MinIO secret key
 *   SOURCE_S3_BUCKET      - MinIO bucket name (e.g. aurora)
 *
 *   DEST_S3_ENDPOINT      - R2 endpoint (e.g. https://<account-id>.r2.cloudflarestorage.com)
 *   DEST_S3_ACCESS_KEY    - R2 access key
 *   DEST_S3_SECRET_KEY    - R2 secret key
 *   DEST_S3_BUCKET        - R2 bucket name (e.g. aurora)
 *
 * Usage:
 *   npx tsx scripts/migrate-minio-to-r2.ts
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return val;
}

const source = new S3Client({
  endpoint: requireEnv("SOURCE_S3_ENDPOINT"),
  region: "us-east-1",
  credentials: {
    accessKeyId: requireEnv("SOURCE_S3_ACCESS_KEY"),
    secretAccessKey: requireEnv("SOURCE_S3_SECRET_KEY"),
  },
  forcePathStyle: true,
});

const dest = new S3Client({
  endpoint: requireEnv("DEST_S3_ENDPOINT"),
  region: "auto",
  credentials: {
    accessKeyId: requireEnv("DEST_S3_ACCESS_KEY"),
    secretAccessKey: requireEnv("DEST_S3_SECRET_KEY"),
  },
  forcePathStyle: true,
});

const sourceBucket = requireEnv("SOURCE_S3_BUCKET");
const destBucket = requireEnv("DEST_S3_BUCKET");
const destPrefix = process.env.DEST_S3_PREFIX ?? "";

async function streamToBuffer(stream: ReadableStream | NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function migrate() {
  let continuationToken: string | undefined;
  let total = 0;
  let errors = 0;

  console.log(`Migrating from ${sourceBucket} → ${destBucket}`);

  do {
    const list = await source.send(
      new ListObjectsV2Command({
        Bucket: sourceBucket,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = list.Contents ?? [];

    for (const obj of objects) {
      if (!obj.Key) continue;

      try {
        const get = await source.send(
          new GetObjectCommand({ Bucket: sourceBucket, Key: obj.Key }),
        );

        if (!get.Body) {
          console.warn(`  SKIP (no body): ${obj.Key}`);
          continue;
        }

        const body = await streamToBuffer(get.Body as NodeJS.ReadableStream);

        const destKey = destPrefix ? `${destPrefix}/${obj.Key}` : obj.Key;

        await dest.send(
          new PutObjectCommand({
            Bucket: destBucket,
            Key: destKey,
            Body: body,
            ContentType: get.ContentType,
          }),
        );

        total++;
        console.log(`  OK [${total}]: ${obj.Key} (${(body.length / 1024).toFixed(1)} KB)`);
      } catch (err) {
        errors++;
        console.error(`  FAIL: ${obj.Key}`, err);
      }
    }

    continuationToken = list.NextContinuationToken;
  } while (continuationToken);

  console.log(`\nDone. Migrated: ${total}, Errors: ${errors}`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
