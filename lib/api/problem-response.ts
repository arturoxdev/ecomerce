import { NextResponse } from "next/server";
import type { ProblemDetail } from "@/lib/types/problem-detail";

/**
 * Return an RFC 9457 compliant error response from an API route.
 */
export function problemResponse(problem: ProblemDetail): NextResponse {
  return NextResponse.json(problem, {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
}
