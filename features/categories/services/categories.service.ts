import "server-only";

import { and, asc, eq, SQL } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db, type Database } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export type CategoriesServiceDeps = {
  db: Database;
  storeId: string;
};

export function createCategoriesService(deps: CategoriesServiceDeps) {
  const { db: dbx, storeId } = deps;

  function findAll(opts?: {
    columns?: Record<string, boolean>;
    orderBy?: SQL;
    limit?: number;
  }) {
    return dbx.query.categories.findMany({
      where: eq(categories.storeId, storeId),
      columns: opts?.columns as undefined,
      orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
      limit: opts?.limit,
    });
  }

  function findAllWithProductCount() {
    return dbx.query.categories.findMany({
      where: eq(categories.storeId, storeId),
      orderBy: [asc(categories.sortOrder)],
      with: { products: { columns: { id: true } } },
    });
  }

  function findById(id: string) {
    return dbx.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.storeId, storeId)),
    });
  }

  function findBySlug(slug: string) {
    return dbx.query.categories.findFirst({
      where: and(eq(categories.slug, slug), eq(categories.storeId, storeId)),
    });
  }

  return {
    findAll,
    findAllWithProductCount,
    findById,
    findBySlug,
  };
}

export type CategoriesService = ReturnType<typeof createCategoriesService>;

const defaultService = createCategoriesService({ db, storeId: getStoreId() });

export const findAll = defaultService.findAll;
export const findAllWithProductCount = defaultService.findAllWithProductCount;
export const findById = defaultService.findById;
export const findBySlug = defaultService.findBySlug;
