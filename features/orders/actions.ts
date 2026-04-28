"use server";

import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireWriteAccess } from "@/lib/services/auth";
import type { ProblemDetail } from "@/lib/types/problem-detail";

import {
  findCustomerSuggestions,
  type CustomerSuggestion,
} from "./data";
import {
  createOrderActionsService,
  type CancelOrderResult,
  type MarkPaidResult,
} from "./services/order-actions.service";
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

export async function searchCustomerSuggestions(
  query: string,
): Promise<CustomerSuggestion[]> {
  await requireWriteAccess();
  return findCustomerSuggestions(query);
}

export async function markOrderAsPaid(
  orderId: string,
  paymentMethod: "CASH" | "TRANSFER",
): Promise<MarkPaidResult | ProblemDetail> {
  const user = await requireWriteAccess();
  const service = createOrderActionsService({
    db,
    storeId: getStoreId(),
    userId: user.id,
  });

  const result = await service.markOrderAsPaid(orderId, paymentMethod);
  if (!result.success) return result.problem;

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return result;
}

export async function cancelOrder(
  orderId: string,
): Promise<CancelOrderResult | ProblemDetail> {
  const user = await requireWriteAccess();
  const service = createOrderActionsService({
    db,
    storeId: getStoreId(),
    userId: user.id,
  });

  const result = await service.cancelOrder(orderId);
  if (!result.success) return result.problem;

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/schedule");
  return result;
}
