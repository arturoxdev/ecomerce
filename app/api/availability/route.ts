import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type OccupiedResult = [{ occupied: number }];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  // Presence checks
  if (!productId)
    return NextResponse.json(
      { error: "productId is required" },
      { status: 400 }
    );
  if (!start)
    return NextResponse.json({ error: "start is required" }, { status: 400 });
  if (!end)
    return NextResponse.json({ error: "end is required" }, { status: 400 });

  // UUID format check
  if (!UUID_RE.test(productId))
    return NextResponse.json(
      { error: "productId must be a valid UUID" },
      { status: 400 }
    );

  // Date format check
  if (!DATE_RE.test(start))
    return NextResponse.json(
      { error: "Invalid date format for start. Use YYYY-MM-DD" },
      { status: 400 }
    );
  if (!DATE_RE.test(end))
    return NextResponse.json(
      { error: "Invalid date format for end. Use YYYY-MM-DD" },
      { status: 400 }
    );

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()))
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  if (isNaN(endDate.getTime()))
    return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
  if (endDate <= startDate)
    return NextResponse.json(
      { error: "end must be after start" },
      { status: 400 }
    );

  // Product lookup
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive)
    return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Availability aggregate query + business logic
  try {
    const result = await db.$queryRaw<OccupiedResult>`
      SELECT COALESCE(SUM(quantity), 0)::int AS occupied
      FROM availability
      WHERE product_id = ${productId}::uuid
        AND start_date < ${endDate}::timestamp
        AND end_date > ${startDate}::timestamp
    `;

    // SUM() from $queryRaw can return BigInt — use Number() to convert safely
    const occupied = Number(result[0]?.occupied ?? 0);

    let available: number;
    if (product.priceType === "FIXED") {
      // FIXED: either it's occupied or not — binary availability
      available = occupied >= 1 ? 0 : 1;
    } else {
      // PER_UNIT: available = max(0, stock - occupied)
      available = Math.max(0, (product.stock ?? 0) - occupied);
    }

    return NextResponse.json({
      available,
      pricingModel: product.priceType,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
