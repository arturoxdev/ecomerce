import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { problemResponse } from "@/lib/api/problem-response";
import { validationProblem, internalProblem } from "@/lib/problems";
import { ProblemType } from "@/lib/types/problem-detail";
import { s3Bucket, s3Client, s3PublicUrl } from "@/features/media";

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

  const prefix = s3PublicUrl.endsWith("/") ? s3PublicUrl : `${s3PublicUrl}/`;
  if (!url.startsWith(prefix)) {
    return problemResponse({
      type: ProblemType.VALIDATION_ERROR,
      status: 400,
      title: "Bad request",
      detail: "URL does not belong to this bucket",
    });
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
    return problemResponse(internalProblem("Failed to delete file"));
  }

  return NextResponse.json({ ok: true });
}
