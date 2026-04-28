import "server-only";

import { and, eq, gte, lte } from "drizzle-orm";

import { db, type Database } from "@/lib/db";
import { orderItems } from "@/lib/db/schema";

export type OrderItemsServiceDeps = {
  db: Database;
};

export function createOrderItemsService(deps: OrderItemsServiceDeps) {
  const { db: dbx } = deps;

  function findByDate(date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return dbx.query.orderItems.findMany({
      where: and(
        gte(orderItems.rentDate, dayStart),
        lte(orderItems.rentDate, dayEnd),
      ),
      with: {
        order: {
          columns: {
            id: true,
            customerName: true,
            customerPhone: true,
            deliveryAddress: true,
            storeId: true,
          },
        },
        product: { columns: { id: true, name: true } },
        variant: { columns: { id: true, name: true } },
      },
    });
  }

  function findByOrderId(orderId: string) {
    return dbx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
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
    });
  }

  return { findByDate, findByOrderId };
}

export type OrderItemsService = ReturnType<typeof createOrderItemsService>;

const defaultService = createOrderItemsService({ db });

export const findByDate = defaultService.findByDate;
export const findByOrderId = defaultService.findByOrderId;
