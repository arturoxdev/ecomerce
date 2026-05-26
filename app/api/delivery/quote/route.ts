import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { quoteDelivery } from "@/features/delivery-pricing/services/quote.service";
import { problemResponse } from "@/lib/api/problem-response";
import { getStoreId } from "@/lib/config/tenant";
import { tooManyRequestsProblem, validationProblem } from "@/lib/problems";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const querySchema = z.object({
  destLat: z.coerce.number().gte(-90).lte(90),
  destLng: z.coerce.number().gte(-180).lte(180),
});

/**
 * Per-IP rate-limited delivery quote. A successful quote (incl. OUT_OF_CAP /
 * UNAVAILABLE business outcomes) returns 200 with the result union; only HTTP
 * concerns (rate limit, bad input) return RFC 9457 problems.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit(`deliveryQuote:ip:${ip}`, 30, 10 * 60);
  if (!limit.allowed) {
    return problemResponse(
      tooManyRequestsProblem("Demasiadas solicitudes. Intenta de nuevo en un momento."),
    );
  }

  const sp = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    destLat: sp.get("destLat"),
    destLng: sp.get("destLng"),
  });
  if (!parsed.success) return problemResponse(validationProblem(parsed.error));

  const result = await quoteDelivery({
    storeId: getStoreId(),
    destLat: parsed.data.destLat,
    destLng: parsed.data.destLng,
  });

  // Trim the internal tier (id/bounds) from the public success payload; the
  // browser only needs the miles + fee.
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      miles: result.miles,
      fee: result.fee,
    });
  }
  return NextResponse.json(result);
}
