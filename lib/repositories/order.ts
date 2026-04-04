import { and, asc, eq, gt, lt, SQL } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

export function findAll(opts?: {
  orderBy?: SQL;
  limit?: number;
  offset?: number;
  with?: Record<string, boolean>;
}) {
  return db.query.orders.findMany({
    where: eq(orders.storeId, getStoreId()),
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
    offset: opts?.offset,
    with: opts?.with as undefined,
  });
}

export function findById(id: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.storeId, getStoreId())),
  });
}

export function create(data: Omit<typeof orders.$inferInsert, "storeId">) {
  return db
    .insert(orders)
    .values({ ...data, storeId: getStoreId() })
    .returning()
    .then((r) => r[0]);
}

export function update(
  id: string,
  data: Partial<typeof orders.$inferInsert>,
) {
  return db
    .update(orders)
    .set(data)
    .where(and(eq(orders.id, id), eq(orders.storeId, getStoreId())))
    .returning()
    .then((r) => r[0]);
}

export function findByDateRange(startDate: Date, endDate: Date) {
  return db.query.orders.findMany({
    where: and(
      eq(orders.storeId, getStoreId()),
      lt(orders.rentStartDate, endDate),
      gt(orders.rentEndDate, startDate),
    ),
    orderBy: [asc(orders.rentStartDate)],
  });
}
