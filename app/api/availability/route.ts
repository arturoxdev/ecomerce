import { NextRequest, NextResponse } from "next/server";

import {
  findProductById,
  findVariantById,
  findByDateRange,
} from "@/features/catalog";
import { problemResponse } from "@/lib/api/problem-response";
import { notFoundProblem, internalProblem } from "@/lib/problems";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ProblemType } from "@/lib/types/problem-detail";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(detail: string) {
  return problemResponse({
    type: ProblemType.VALIDATION_ERROR,
    status: 400,
    title: "Bad request",
    detail,
  });
}

export async function GET(request: NextRequest) {
  const rate = await checkRateLimit(
    `avail:ip:${getClientIp(request.headers)}`,
    60,
    60,
  );
  if (!rate.allowed) {
    return problemResponse({
      type: ProblemType.VALIDATION_ERROR,
      status: 429,
      title: "Too many requests",
      detail: "Rate limit exceeded",
    });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const variantId = searchParams.get("variantId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  // Presence checks
  if (!productId) return badRequest("productId is required");
  if (!start) return badRequest("start is required");
  if (!end) return badRequest("end is required");

  // UUID format check
  if (!UUID_RE.test(productId))
    return badRequest("productId must be a valid UUID");
  if (variantId && !UUID_RE.test(variantId))
    return badRequest("variantId must be a valid UUID");

  // Date format check
  if (!DATE_RE.test(start))
    return badRequest("Invalid date format for start. Use YYYY-MM-DD");
  if (!DATE_RE.test(end))
    return badRequest("Invalid date format for end. Use YYYY-MM-DD");

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime())) return badRequest("Invalid start date");
  if (isNaN(endDate.getTime())) return badRequest("Invalid end date");
  if (endDate <= startDate) return badRequest("end must be after start");

  // Product lookup
  const product = await findProductById(productId);
  if (!product || !product.isActive)
    return problemResponse(notFoundProblem("Product not found"));

  // If variantId provided, validate it belongs to the product
  let stock = product.stock ?? 0;
  if (variantId) {
    const variant = await findVariantById(variantId);
    if (!variant || variant.productId !== productId || !variant.isActive)
      return problemResponse(notFoundProblem("Variant not found"));
    stock = variant.stock;
  }

  // Availability aggregate query + business logic
  try {
    const result = await findByDateRange(
      productId,
      startDate,
      endDate,
      variantId,
    );

    // SUM() from $queryRaw can return BigInt — use Number() to convert safely
    const occupied = Number(result.rows[0]?.occupied ?? 0);

    let available: number;
    if (product.priceType === "FIXED") {
      // FIXED: either it's occupied or not — binary availability
      available = occupied >= 1 ? 0 : 1;
    } else {
      // PER_UNIT: available = max(0, stock - occupied)
      available = Math.max(0, stock - occupied);
    }

    return NextResponse.json({
      available,
      pricingModel: product.priceType,
    });
  } catch {
    return problemResponse(internalProblem("Internal server error"));
  }
}
