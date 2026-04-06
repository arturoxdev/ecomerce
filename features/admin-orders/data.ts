import "server-only";

import { and, asc, desc, eq, gt, lt, SQL } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function findAll(opts?: {
  orderBy?: SQL;
  limit?: number;
  offset?: number;
}) {
  return db.query.orders.findMany({
    where: eq(orders.storeId, getStoreId()),
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : [desc(orders.createdAt)],
    limit: opts?.limit,
    offset: opts?.offset,
  });
}

export function findAllWithItems(opts?: {
  orderBy?: SQL;
  limit?: number;
  offset?: number;
}) {
  return db.query.orders.findMany({
    where: eq(orders.storeId, getStoreId()),
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : [desc(orders.createdAt)],
    limit: opts?.limit,
    offset: opts?.offset,
    with: { orderItems: true },
  });
}

export function findById(id: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.storeId, getStoreId())),
  });
}

export function findByIdWithItems(id: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.storeId, getStoreId())),
    with: {
      orderItems: {
        with: {
          product: { columns: { id: true, name: true, slug: true, photos: true, priceType: true } },
          variant: { columns: { id: true, name: true } },
        },
      },
    },
  });
}

export async function findByDateRange(startDate: Date, endDate: Date) {
  const storeId = getStoreId();
  return db.query.orders.findMany({
    where: eq(orders.storeId, storeId),
    with: {
      orderItems: {
        where: and(
          lt(orderItems.rentStartDate, endDate),
          gt(orderItems.rentEndDate, startDate),
        ),
      },
    },
    orderBy: [desc(orders.createdAt)],
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

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

export function count() {
  return db.query.orders
    .findMany({ where: eq(orders.storeId, getStoreId()) })
    .then((r) => r.length);
}
