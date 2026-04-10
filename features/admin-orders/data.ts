import "server-only";

import { and, asc, desc, eq, gt, lt, SQL } from "drizzle-orm";

import { reconcileStripeOrder } from "@/features/checkout";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { forbiddenProblem } from "@/lib/problems";
import type { ProblemDetail } from "@/lib/types/problem-detail";

const IMMUTABLE_FIELDS_WHEN_PAID = [
  "total",
  "subtotal",
  "deliveryFee",
  "amountPaid",
  "deliveryAddress",
] as const;

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

async function maybeSelfHeal(
  row: typeof orders.$inferSelect | undefined,
) {
  if (!row) return;
  if (row.status !== "PENDING") return;
  if (!row.stripeSessionExpiresAt) return;
  if (row.stripeSessionExpiresAt.getTime() > Date.now()) return;
  await reconcileStripeOrder(row);
}

export async function findById(id: string) {
  const row = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.storeId, getStoreId())),
  });
  await maybeSelfHeal(row);
  if (!row) return row;
  return db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.storeId, getStoreId())),
  });
}

export async function findByIdWithItems(id: string) {
  const row = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.storeId, getStoreId())),
  });
  await maybeSelfHeal(row);
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

export async function update(
  id: string,
  data: Partial<typeof orders.$inferInsert>,
): Promise<typeof orders.$inferSelect | ProblemDetail> {
  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.storeId, getStoreId())),
  });
  if (!existing) {
    return forbiddenProblem("Order not found");
  }

  if (existing.paymentStatus === "CAPTURED") {
    const blocked = Object.keys(data).filter((k) =>
      (IMMUTABLE_FIELDS_WHEN_PAID as readonly string[]).includes(k),
    );
    if (blocked.length > 0) {
      return forbiddenProblem(
        `Cannot modify ${blocked.join(", ")} after payment capture`,
      );
    }
  }

  const result = await db
    .update(orders)
    .set(data)
    .where(and(eq(orders.id, id), eq(orders.storeId, getStoreId())))
    .returning();
  return result[0];
}

export function count() {
  return db.query.orders
    .findMany({ where: eq(orders.storeId, getStoreId()) })
    .then((r) => r.length);
}
