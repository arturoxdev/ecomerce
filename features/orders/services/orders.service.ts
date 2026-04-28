import "server-only";

import { and, desc, eq, gte, lte, SQL } from "drizzle-orm";

import { reconcileStripeOrder } from "@/features/checkout";
import { getStoreId } from "@/lib/config/tenant";
import { db, type Database } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { forbiddenProblem } from "@/lib/problems";
import type { ProblemDetail } from "@/lib/types/problem-detail";

export const IMMUTABLE_FIELDS_WHEN_PAID = [
  "total",
  "subtotal",
  "deliveryFee",
  "amountPaid",
  "deliveryAddress",
] as const;

type OrderRow = typeof orders.$inferSelect;

export type ReconcileStripeOrder = (order: OrderRow) => Promise<void>;

export type OrdersServiceDeps = {
  db: Database;
  storeId: string;
  reconcileStripeOrder?: ReconcileStripeOrder;
};

export function createOrdersService(deps: OrdersServiceDeps) {
  const { db: dbx, storeId } = deps;

  async function maybeSelfHeal(row: OrderRow | undefined) {
    if (!deps.reconcileStripeOrder) return;
    if (!row) return;
    if (row.status !== "PENDING") return;
    if (!row.stripeSessionExpiresAt) return;
    if (row.stripeSessionExpiresAt.getTime() > Date.now()) return;
    await deps.reconcileStripeOrder(row);
  }

  function findAll(opts?: { orderBy?: SQL; limit?: number; offset?: number }) {
    return dbx.query.orders.findMany({
      where: eq(orders.storeId, storeId),
      orderBy: opts?.orderBy ? () => [opts.orderBy!] : [desc(orders.createdAt)],
      limit: opts?.limit,
      offset: opts?.offset,
    });
  }

  function findAllWithItems(opts?: {
    orderBy?: SQL;
    limit?: number;
    offset?: number;
  }) {
    return dbx.query.orders.findMany({
      where: eq(orders.storeId, storeId),
      orderBy: opts?.orderBy ? () => [opts.orderBy!] : [desc(orders.createdAt)],
      limit: opts?.limit,
      offset: opts?.offset,
      with: { orderItems: true },
    });
  }

  async function findById(id: string) {
    const row = await dbx.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.storeId, storeId)),
    });
    await maybeSelfHeal(row);
    if (!row) return row;
    return dbx.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.storeId, storeId)),
    });
  }

  async function findByIdWithItems(id: string) {
    const row = await dbx.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.storeId, storeId)),
    });
    await maybeSelfHeal(row);
    return dbx.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.storeId, storeId)),
      with: {
        orderItems: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
                photos: true,
                priceType: true,
              },
            },
            variant: { columns: { id: true, name: true } },
          },
        },
      },
    });
  }

  async function findByDateRange(startDate: Date, endDate: Date) {
    return dbx.query.orders.findMany({
      where: eq(orders.storeId, storeId),
      with: {
        orderItems: {
          where: and(
            gte(orderItems.rentDate, startDate),
            lte(orderItems.rentDate, endDate),
          ),
        },
      },
      orderBy: [desc(orders.createdAt)],
    });
  }

  function create(data: Omit<typeof orders.$inferInsert, "storeId">) {
    return dbx
      .insert(orders)
      .values({ ...data, storeId })
      .returning()
      .then((r) => r[0]);
  }

  async function update(
    id: string,
    data: Partial<typeof orders.$inferInsert>,
  ): Promise<OrderRow | ProblemDetail> {
    const existing = await dbx.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.storeId, storeId)),
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

    const result = await dbx
      .update(orders)
      .set(data)
      .where(and(eq(orders.id, id), eq(orders.storeId, storeId)))
      .returning();
    return result[0];
  }

  function count() {
    return dbx.query.orders
      .findMany({ where: eq(orders.storeId, storeId) })
      .then((r) => r.length);
  }

  return {
    findAll,
    findAllWithItems,
    findById,
    findByIdWithItems,
    findByDateRange,
    create,
    update,
    count,
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;

const defaultService = createOrdersService({
  db,
  storeId: getStoreId(),
  reconcileStripeOrder,
});

export const findAll = defaultService.findAll;
export const findAllWithItems = defaultService.findAllWithItems;
export const findById = defaultService.findById;
export const findByIdWithItems = defaultService.findByIdWithItems;
export const findByDateRange = defaultService.findByDateRange;
export const create = defaultService.create;
export const update = defaultService.update;
export const count = defaultService.count;
