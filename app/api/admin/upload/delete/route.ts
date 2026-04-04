import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { s3Bucket, s3Client, s3PublicUrl } from "@/lib/minio";

const deleteSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { url } = parsed.data;

  const prefix = s3PublicUrl.endsWith("/") ? s3PublicUrl : `${s3PublicUrl}/`;
  if (!url.startsWith(prefix)) {
    return NextResponse.json({ error: "URL does not belong to this bucket" }, { status: 400 });
  }

  const key = url.slice(prefix.length);

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: s3Bucket,
        Key: key,
      }),
    );
  } catch (err) {
    console.error("[upload/delete] DeleteObjectCommand failed:", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
