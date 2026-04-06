import { and, eq, gte, lte, sql } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";

/**
 * Find order items where the rental period starts or ends on a given date.
 * Used by the admin calendar/delivery schedule.
 */
export function findByDate(date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return db.query.orderItems.findMany({
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

export function findByOrderId(orderId: string) {
  return db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
    with: {
      product: { columns: { id: true, name: true, slug: true, photos: true, priceType: true } },
      variant: { columns: { id: true, name: true } },
    },
  });
}
