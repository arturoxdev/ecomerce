import { NextRequest } from "next/server";

import { handleAvailabilityMonthRequest } from "@/features/products/services/availability-month.handler";
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
    `avail-month:ip:${getClientIp(request.headers)}`,
    60,
    60,
  );
  if (!rate.allowed) {
    return problemResponse(tooManyRequestsProblem());
  }

  const sp = new URL(request.url).searchParams;
  return handleAvailabilityMonthRequest(
    {
      productId: sp.get("productId"),
      variantId: sp.get("variantId"),
      month: sp.get("month"),
    },
    { db, findProductById, findVariantById },
  );
}
