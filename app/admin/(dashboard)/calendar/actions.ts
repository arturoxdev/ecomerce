"use server";

import { getStoreId } from "@/lib/config/tenant";
import { findOrderItemsByDate } from "@/features/admin-orders";

export type ScheduleEntry = {
  type: "delivery" | "pickup";
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  itemsSummary: string;
  rentStartDate: string;
  rentEndDate: string;
};

export async function getScheduleForDate(
  dateStr: string,
): Promise<ScheduleEntry[]> {
  const date = new Date(dateStr + "T00:00:00");
  const storeId = getStoreId();

  const items = await findOrderItemsByDate(date);

  // Filter by storeId (since order-item query doesn't filter by store)
  const storeItems = items.filter((item) => item.order.storeId === storeId);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Group items by orderId to create summary
  const orderGroups = new Map<
    string,
    {
      order: (typeof storeItems)[0]["order"];
      items: typeof storeItems;
    }
  >();

  for (const item of storeItems) {
    const group = orderGroups.get(item.order.id);
    if (group) {
      group.items.push(item);
    } else {
      orderGroups.set(item.order.id, { order: item.order, items: [item] });
    }
  }

  const entries: ScheduleEntry[] = [];

  for (const [, group] of orderGroups) {
    const itemsSummary = group.items
      .map((i) => {
        const name = i.variant?.name
          ? `${i.product.name} (${i.variant.name})`
          : i.product.name;
        return i.quantity > 1 ? `${i.quantity}× ${name}` : name;
      })
      .join(", ");

    // Check if any item starts on this day
    const hasDelivery = group.items.some((i) => {
      const start = new Date(i.rentStartDate);
      return start >= dayStart && start <= dayEnd;
    });

    // Check if any item ends on this day
    const hasPickup = group.items.some((i) => {
      const end = new Date(i.rentEndDate);
      return end >= dayStart && end <= dayEnd;
    });

    const baseEntry = {
      orderId: group.order.id,
      customerName: group.order.customerName,
      customerPhone: group.order.customerPhone,
      deliveryAddress: group.order.deliveryAddress,
      itemsSummary,
      rentStartDate: group.items[0].rentStartDate.toISOString(),
      rentEndDate: group.items[0].rentEndDate.toISOString(),
    };

    if (hasDelivery) {
      entries.push({ ...baseEntry, type: "delivery" });
    }
    if (hasPickup) {
      entries.push({ ...baseEntry, type: "pickup" });
    }
  }

  // Sort: deliveries first, then pickups
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "delivery" ? -1 : 1;
    return 0;
  });

  return entries;
}
