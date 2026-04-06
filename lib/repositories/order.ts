import { and, desc, eq, SQL } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

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
