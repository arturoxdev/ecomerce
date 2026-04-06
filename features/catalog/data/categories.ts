import "server-only";

import { and, asc, eq, SQL } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Reads (public — no auth required, used by storefront)
// ---------------------------------------------------------------------------

export function findAll(opts?: {
  columns?: Record<string, boolean>;
  orderBy?: SQL;
  limit?: number;
}) {
  return db.query.categories.findMany({
    where: eq(categories.storeId, getStoreId()),
    columns: opts?.columns as undefined,
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
  });
}

export function findAllWithProductCount() {
  return db.query.categories.findMany({
    where: eq(categories.storeId, getStoreId()),
    orderBy: [asc(categories.sortOrder)],
    with: { products: { columns: { id: true } } },
  });
}

export function findById(id: string) {
  return db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.storeId, getStoreId())),
  });
}

export function findBySlug(slug: string) {
  return db.query.categories.findFirst({
    where: and(
      eq(categories.slug, slug),
      eq(categories.storeId, getStoreId()),
    ),
  });
}
