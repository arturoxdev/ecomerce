import { NextRequest, NextResponse } from "next/server";

import { searchZipcodes } from "@/features/zipcodes/services/zipcodes.service";

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const query = sp.get("q") ?? "";
  const limit = Math.min(50, Math.max(1, Number.parseInt(sp.get("limit") ?? "20", 10) || 20));

  const rows = await searchZipcodes(query, limit);
  return NextResponse.json({
    items: rows.map((row) => ({
      city: row.city,
      zipcode: row.zipcode,
      fee: parseFloat(row.fee),
    })),
  });
}
