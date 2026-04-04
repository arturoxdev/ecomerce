import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getStoreId } from "@/lib/config/tenant";
import {
  ALL_MEDIA_MIME_TYPES,
  getMaxSizeForMime,
  isVideoMime,
} from "@/lib/media";
import { s3Bucket, s3Client, s3PublicUrl } from "@/lib/minio";

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().refine(
    (v) => (ALL_MEDIA_MIME_TYPES as readonly string[]).includes(v),
    "Unsupported file type",
  ),
  fileSize: z.number().positive(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = presignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { filename, contentType, fileSize } = parsed.data;

  const maxSize = getMaxSizeForMime(contentType);
  if (fileSize > maxSize) {
    const limitMB = maxSize / (1024 * 1024);
    const typeLabel = isVideoMime(contentType) ? "Videos" : "Images";
    return NextResponse.json(
      { error: `${typeLabel} must be under ${limitMB}MB` },
      { status: 400 },
    );
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const storeId = getStoreId();
  const objectName = `${storeId}/products/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: objectName,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 600,
    unhoistableHeaders: new Set(["content-type"]),
  });

  const publicUrl = `${s3PublicUrl}/${objectName}`;

  return NextResponse.json({ presignedUrl, publicUrl });
}
