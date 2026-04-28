import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

export type CustomerSuggestion = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string | null;
};

const SUGGESTION_LIMIT = 8;

export async function findCustomerSuggestions(
  query: string,
): Promise<CustomerSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed}%`;
  const storeId = getStoreId();

  const rows = await db
    .select({
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      deliveryAddress: sql<
        string | null
      >`MAX(${orders.deliveryAddress})`.as("delivery_address"),
      lastSeen: sql<Date>`MAX(${orders.createdAt})`.as("last_seen"),
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        or(
          ilike(orders.customerName, pattern),
          ilike(orders.customerEmail, pattern),
          ilike(orders.customerPhone, pattern),
        ),
      ),
    )
    .groupBy(orders.customerName, orders.customerEmail, orders.customerPhone)
    .orderBy(desc(sql`MAX(${orders.createdAt})`))
    .limit(SUGGESTION_LIMIT);

  return rows.map((r) => ({
    customerName: r.customerName,
    customerEmail: r.customerEmail,
    customerPhone: r.customerPhone,
    deliveryAddress: r.deliveryAddress,
  }));
}
