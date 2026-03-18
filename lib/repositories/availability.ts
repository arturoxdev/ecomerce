import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { availability } from "@/lib/db/schema";

function firstOccupiedRow(result: { rows: { occupied: number }[] }) {
  return result.rows[0]?.occupied ?? 0;
}

export function findByProduct(productId: string) {
  return db.query.availability.findMany({
    where: eq(availability.productId, productId),
    orderBy: [desc(availability.startDate)],
    with: { order: { columns: { id: true, customerName: true } } },
  });
}

export function findByDateRange(
  productId: string,
  startDate: Date,
  endDate: Date,
) {
  return db.execute<{ occupied: number }>(sql`
    SELECT COALESCE(SUM(quantity), 0)::int AS occupied
    FROM availability
    WHERE product_id = ${productId}::uuid
      AND start_date < ${endDate}::timestamp
      AND end_date > ${startDate}::timestamp
  `);
}

export function createBlock(data: typeof availability.$inferInsert) {
  return db
    .insert(availability)
    .values(data)
    .returning()
    .then((r) => r[0]);
}

export function deleteBlock(id: string) {
  return db.delete(availability).where(eq(availability.id, id));
}

export function findBlockById(id: string) {
  return db.query.availability.findFirst({
    where: eq(availability.id, id),
  });
}

export function checkOverlapAndCreate(
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number,
  stock: number,
  extra?: { reason?: string },
) {
  return db.transaction(async (tx) => {
    const result = await tx.execute<{ occupied: number }>(sql`
      SELECT COALESCE(SUM(quantity), 0)::int AS occupied
      FROM availability
      WHERE product_id = ${productId}::uuid
        AND start_date < ${endDate}::timestamp
        AND end_date > ${startDate}::timestamp
    `);
    const occupied = Number(firstOccupiedRow(result));

    if (occupied + quantity > stock) {
      return { ok: false as const, occupied };
    }

    const [block] = await tx
      .insert(availability)
      .values({
        productId,
        startDate,
        endDate,
        quantity,
        orderId: null,
        ...(extra?.reason ? { reason: extra.reason } : {}),
      })
      .returning();

    return { ok: true as const, block };
  });
}
