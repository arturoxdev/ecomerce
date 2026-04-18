import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { problemResponse } from "@/lib/api/problem-response";
import { s3Bucket, s3Client, s3PublicUrl } from "@/lib/services/s3-client";
import { validationProblem, internalProblem } from "@/lib/problems";
import { getObjectKeyFromPublicMediaUrl } from "@/lib/services/media-url.service";
import { ProblemType } from "@/lib/types/problem-detail";

const deleteSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return problemResponse(validationProblem(parsed.error, "Invalid URL"));
  }

  const { url } = parsed.data;

  const key = getObjectKeyFromPublicMediaUrl(url, s3PublicUrl);
  if (!key) {
    return problemResponse({
      type: ProblemType.VALIDATION_ERROR,
      status: 400,
      title: "Bad request",
      detail: "URL does not belong to this bucket",
    });
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: s3Bucket,
        Key: key,
      }),
    );
  } catch (err) {
    console.error("[upload/delete] DeleteObjectCommand failed:", err);
    return problemResponse(internalProblem("Failed to delete file"));
  }

  return NextResponse.json({ ok: true });
}
