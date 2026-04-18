import { NextRequest } from "next/server";

import {
  findProductById,
  findVariantById,
} from "@/features/products/services/products.service";
import { handleAvailabilityRequest } from "@/features/products/services/availability.handler";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
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
