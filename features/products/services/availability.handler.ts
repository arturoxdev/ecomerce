import "server-only";

import { NextResponse } from "next/server";

import { problemResponse } from "@/lib/api/problem-response";
import { internalProblem, notFoundProblem } from "@/lib/problems";
import {
  calculateAvailableQuantity,
  findOccupiedQuantity,
} from "@/lib/services/availability.service";
import type { Database } from "@/lib/db";
import type { PriceType } from "@/lib/db/schema";
import { ProblemType } from "@/lib/types/problem-detail";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type AvailabilityRequestParams = {
  productId: string | null;
  variantId: string | null;
  start: string | null;
  end: string | null;
};

type AvailabilityHandlerProduct = {
  id: string;
  stock: number | null;
  isActive: boolean;
  priceType: PriceType;
};

type AvailabilityHandlerVariant = {
  id: string;
  productId: string;
  isActive: boolean;
  stock: number;
};

export type AvailabilityHandlerDeps = {
  db: Database;
  findProductById: (id: string) => Promise<AvailabilityHandlerProduct | null | undefined>;
  findVariantById: (id: string) => Promise<AvailabilityHandlerVariant | null | undefined>;
};

function badRequest(detail: string) {
  return problemResponse({
    type: ProblemType.VALIDATION_ERROR,
    status: 400,
    title: "Bad request",
    detail,
  });
}

export async function handleAvailabilityRequest(
  params: AvailabilityRequestParams,
  deps: AvailabilityHandlerDeps,
): Promise<Response> {
  const { productId, variantId, start, end } = params;

  if (!productId) return badRequest("productId is required");
  if (!start) return badRequest("start is required");
  if (!end) return badRequest("end is required");

  if (!UUID_RE.test(productId)) return badRequest("productId must be a valid UUID");
  if (variantId && !UUID_RE.test(variantId))
    return badRequest("variantId must be a valid UUID");

  if (!DATE_RE.test(start))
    return badRequest("Invalid date format for start. Use YYYY-MM-DD");
  if (!DATE_RE.test(end))
    return badRequest("Invalid date format for end. Use YYYY-MM-DD");

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime())) return badRequest("Invalid start date");
  if (isNaN(endDate.getTime())) return badRequest("Invalid end date");
  if (endDate <= startDate) return badRequest("end must be after start");

  const product = await deps.findProductById(productId);
  if (!product || !product.isActive)
    return problemResponse(notFoundProblem("Product not found"));

  let stock = product.stock ?? 0;
  if (variantId) {
    const variant = await deps.findVariantById(variantId);
    if (!variant || variant.productId !== productId || !variant.isActive)
      return problemResponse(notFoundProblem("Variant not found"));
    stock = variant.stock;
  }

  try {
    const occupied = await findOccupiedQuantity(deps.db, {
      productId,
      startDate,
      endDate,
      variantId,
    });

    const available = calculateAvailableQuantity({
      occupied,
      stock,
      priceType: product.priceType,
    });

    return NextResponse.json({ available, pricingModel: product.priceType });
  } catch {
    return problemResponse(internalProblem("Internal server error"));
  }
}
