"use client";

import { internalProblem } from "@/lib/problems";
import type { ProblemDetail } from "@/lib/types/problem-detail";

export type UploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; problem: ProblemDetail };

/**
 * Two-step S3 upload: request a pre-signed PUT URL from our admin API
 * and then upload the file directly to object storage. Kept as a
 * client-side service so components stay presentational.
 */
export async function uploadProductImage(file: File): Promise<UploadResult> {
  const presignRes = await fetch("/api/admin/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  if (!presignRes.ok) {
    const problem = (await presignRes.json().catch(() => null)) as
      | ProblemDetail
      | null;
    return {
      ok: false,
      problem: problem ?? internalProblem("Failed to obtain upload URL"),
    };
  }

  const { presignedUrl, publicUrl } = (await presignRes.json()) as {
    presignedUrl: string;
    publicUrl: string;
  };

  const putRes = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!putRes.ok) {
    return { ok: false, problem: internalProblem("Upload to S3 failed") };
  }

  return { ok: true, publicUrl };
}
