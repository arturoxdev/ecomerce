import "server-only";

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { problemResponse } from "@/lib/api/problem-response";
import { internalProblem, notFoundProblem } from "@/lib/problems";
import { calculateAvailableQuantity } from "@/lib/services/availability.service";
import type { Database } from "@/lib/db";
import type { PriceType } from "@/lib/db/schema";
import { ProblemType } from "@/lib/types/problem-detail";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type AvailabilityMonthRequestParams = {
  productId: string | null;
  variantId: string | null;
  month: string | null;
};

type Product = {
  id: string;
  stock: number | null;
  isActive: boolean;
  priceType: PriceType;
};

type Variant = {
  id: string;
  productId: string;
  isActive: boolean;
  stock: number;
};

export type AvailabilityMonthHandlerDeps = {
  db: Database;
  findProductById: (id: string) => Promise<Product | null | undefined>;
  findVariantById: (id: string) => Promise<Variant | null | undefined>;
};

function badRequest(detail: string) {
  return problemResponse({
    type: ProblemType.VALIDATION_ERROR,
    status: 400,
    title: "Bad request",
    detail,
  });
}

type OccupiedRow = { day: string; occupied: number | string | null };

export async function handleAvailabilityMonthRequest(
  params: AvailabilityMonthRequestParams,
  deps: AvailabilityMonthHandlerDeps,
): Promise<Response> {
  const { productId, variantId, month } = params;

  if (!productId) return badRequest("productId is required");
  if (!month) return badRequest("month is required");
  if (!UUID_RE.test(productId)) return badRequest("productId must be a valid UUID");
  if (variantId && !UUID_RE.test(variantId))
    return badRequest("variantId must be a valid UUID");
  if (!MONTH_RE.test(month))
    return badRequest("Invalid month format. Use YYYY-MM");

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIdx, 1));
  const end = new Date(Date.UTC(year, monthIdx + 1, 0, 23, 59, 59, 999));

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
    const result = variantId
      ? await deps.db.execute<OccupiedRow>(sql`
          SELECT to_char(date::date, 'YYYY-MM-DD') AS day,
                 COALESCE(SUM(quantity), 0)::int AS occupied
          FROM availability
          WHERE product_id = ${productId}::uuid
            AND variant_id = ${variantId}::uuid
            AND date >= ${start}::timestamp
            AND date <= ${end}::timestamp
          GROUP BY date::date
        `)
      : await deps.db.execute<OccupiedRow>(sql`
          SELECT to_char(date::date, 'YYYY-MM-DD') AS day,
                 COALESCE(SUM(quantity), 0)::int AS occupied
          FROM availability
          WHERE product_id = ${productId}::uuid
            AND variant_id IS NULL
            AND date >= ${start}::timestamp
            AND date <= ${end}::timestamp
          GROUP BY date::date
        `);

    const unavailableDates: string[] = [];
    for (const row of result.rows) {
      const occupied = Number(row.occupied ?? 0);
      const available = calculateAvailableQuantity({
        occupied,
        stock,
        priceType: product.priceType,
      });
      if (available <= 0) unavailableDates.push(row.day);
    }

    return NextResponse.json({ unavailableDates });
  } catch {
    return problemResponse(internalProblem("Internal server error"));
  }
}
