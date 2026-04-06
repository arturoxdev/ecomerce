"use server";

import { desc } from "drizzle-orm";

import { orders } from "@/lib/db/schema";
import * as orderRepo from "@/lib/repositories/order";

const PAGE_SIZE = 20;

export async function getOrders(opts: { page: number; status?: string }) {
  const offset = (opts.page - 1) * PAGE_SIZE;
  const allOrders = await orderRepo.findAllWithItems({
    orderBy: desc(orders.createdAt),
    limit: PAGE_SIZE,
    offset,
  });
  const total = await orderRepo.count();
  return { orders: allOrders, total, pageSize: PAGE_SIZE };
}

export async function getOrderDetail(orderId: string) {
  return orderRepo.findByIdWithItems(orderId);
}
