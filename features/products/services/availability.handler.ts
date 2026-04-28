import "server-only";

import { NextResponse } from "next/server";

import { problemResponse } from "@/lib/api/problem-response";
import { getMinBookableDate, parseDateOnly } from "@/lib/date";
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
  date: string | null;
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
  const { productId, variantId, date } = params;

  if (!productId) return badRequest("productId is required");
  if (!date) return badRequest("date is required");

  if (!UUID_RE.test(productId)) return badRequest("productId must be a valid UUID");
  if (variantId && !UUID_RE.test(variantId))
    return badRequest("variantId must be a valid UUID");

  if (!DATE_RE.test(date))
    return badRequest("Invalid date format for date. Use YYYY-MM-DD");

  const parsed = parseDateOnly(date);
  if (isNaN(parsed.getTime())) return badRequest("Invalid date");

  if (parsed < getMinBookableDate())
    return badRequest("date must be tomorrow or later");

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
      date: parsed,
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
