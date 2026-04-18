import "server-only";

import { and, desc, eq, gt, lt, SQL } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db, type Database } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";

export type OrdersServiceDeps = {
  db: Database;
  storeId: string;
};

export function createOrdersService(deps: OrdersServiceDeps) {
  const { db: dbx, storeId } = deps;

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

  function findById(id: string) {
    return dbx.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.storeId, storeId)),
    });
  }

  function findByIdWithItems(id: string) {
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
            lt(orderItems.rentStartDate, endDate),
            gt(orderItems.rentEndDate, startDate),
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

  function update(id: string, data: Partial<typeof orders.$inferInsert>) {
    return dbx
      .update(orders)
      .set(data)
      .where(and(eq(orders.id, id), eq(orders.storeId, storeId)))
      .returning()
      .then((r) => r[0]);
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

const defaultService = createOrdersService({ db, storeId: getStoreId() });

export const findAll = defaultService.findAll;
export const findAllWithItems = defaultService.findAllWithItems;
export const findById = defaultService.findById;
export const findByIdWithItems = defaultService.findByIdWithItems;
export const findByDateRange = defaultService.findByDateRange;
export const create = defaultService.create;
export const update = defaultService.update;
export const count = defaultService.count;
