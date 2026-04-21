import { NextRequest } from "next/server";

import { handleAvailabilityRequest } from "@/features/products/services/availability.handler";
import {
  findProductById,
  findVariantById,
} from "@/features/products/services/products.service";
import { problemResponse } from "@/lib/api/problem-response";
import { db } from "@/lib/db";
import { tooManyRequestsProblem } from "@/lib/problems";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rate = await checkRateLimit(
    `avail:ip:${getClientIp(request.headers)}`,
    60,
    60,
  );
  if (!rate.allowed) {
    return problemResponse(tooManyRequestsProblem());
  }

  const sp = new URL(request.url).searchParams;
  return handleAvailabilityRequest(
    {
      productId: sp.get("productId"),
      variantId: sp.get("variantId"),
      start: sp.get("start"),
      end: sp.get("end"),
    },
    { db, findProductById, findVariantById },
  );
}
