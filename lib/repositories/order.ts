import { and, asc, eq, gt, lt, SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

export function findAll(opts?: {
  orderBy?: SQL;
  limit?: number;
  offset?: number;
  with?: Record<string, boolean>;
}) {
  return db.query.orders.findMany({
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
    offset: opts?.offset,
    with: opts?.with as undefined,
  });
}

export function findById(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
  });
}

export function create(data: typeof orders.$inferInsert) {
  return db
    .insert(orders)
    .values(data)
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
    .where(eq(orders.id, id))
    .returning()
    .then((r) => r[0]);
}

export function findByDateRange(startDate: Date, endDate: Date) {
  return db.query.orders.findMany({
    where: and(lt(orders.rentStartDate, endDate), gt(orders.rentEndDate, startDate)),
    orderBy: [asc(orders.rentStartDate)],
  });
}
