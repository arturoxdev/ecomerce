"use server";

import { desc } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { orders } from "@/lib/db/schema";

import { findByDate as findOrderItemsByDate } from "./services/order-items.service";
import {
  count,
  findAllWithItems,
  findByIdWithItems,
} from "./services/orders.service";
import {
  buildScheduleDay,
  buildScheduleEntries,
  type ScheduleEntry,
} from "./services/schedule.service";

const PAGE_SIZE = 20;

export async function getOrders(opts: { page: number; status?: string }) {
  const offset = (opts.page - 1) * PAGE_SIZE;
  const allOrders = await findAllWithItems({
    orderBy: desc(orders.createdAt),
    limit: PAGE_SIZE,
    offset,
  });
  const total = await count();
  return { orders: allOrders, total, pageSize: PAGE_SIZE };
}

export async function getOrderDetail(orderId: string) {
  return findByIdWithItems(orderId);
}

export async function getScheduleForDate(
  dateStr: string,
): Promise<ScheduleEntry[]> {
  const date = new Date(`${dateStr}T00:00:00`);
  const items = await findOrderItemsByDate(date);
  const day = buildScheduleDay(date);
  return buildScheduleEntries(items, day, getStoreId());
}
