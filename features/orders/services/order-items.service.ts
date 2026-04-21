import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, type Database } from "@/lib/db";
import { orderItems } from "@/lib/db/schema";

export type OrderItemsServiceDeps = {
  db: Database;
};

export function createOrderItemsService(deps: OrderItemsServiceDeps) {
  const { db: dbx } = deps;

  /**
   * Find order items whose rental period starts or ends on a given date.
   * Used by the admin calendar/delivery schedule.
   */
  function findByDate(date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return dbx.query.orderItems.findMany({
      where: and(
        sql`(${orderItems.rentStartDate} >= ${dayStart} AND ${orderItems.rentStartDate} <= ${dayEnd})
          OR (${orderItems.rentEndDate} >= ${dayStart} AND ${orderItems.rentEndDate} <= ${dayEnd})`,
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
