import "server-only";

import {
  and,
  asc,
  count as countFn,
  desc,
  eq,
  ilike,
  SQL,
} from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db, type Database } from "@/lib/db";
import {
  availability,
  categories,
  products,
  productVariants,
} from "@/lib/db/schema";
import { findOccupiedQuantity } from "@/lib/services/availability.service";

export type ProductsServiceDeps = {
  db: Database;
  storeId: string;
};

export function createProductsService(deps: ProductsServiceDeps) {
  const { db: dbx, storeId } = deps;

  function findAll(opts?: {
    where?: { isActive?: boolean };
    orderBy?: SQL;
    limit?: number;
    offset?: number;
  }) {
    const conditions: SQL[] = [eq(products.storeId, storeId)];
    if (opts?.where?.isActive !== undefined) {
      conditions.push(eq(products.isActive, opts.where.isActive));
    }

    return dbx.query.products.findMany({
      where: and(...conditions),
      orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
      limit: opts?.limit,
      offset: opts?.offset,
    });
  }

  function findAllWithCategory(opts?: {
    where?: { isActive?: boolean; categoryId?: string; search?: string };
    orderBy?: SQL;
    limit?: number;
    offset?: number;
  }) {
    const conditions: SQL[] = [eq(products.storeId, storeId)];
    if (opts?.where?.isActive !== undefined) {
      conditions.push(eq(products.isActive, opts.where.isActive));
    }
    if (opts?.where?.categoryId) {
      conditions.push(eq(products.categoryId, opts.where.categoryId));
    }
    if (opts?.where?.search) {
      conditions.push(ilike(products.name, `%${opts.where.search}%`));
    }

    return dbx.query.products.findMany({
      where: and(...conditions),
      orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
      limit: opts?.limit,
      offset: opts?.offset,
      with: { category: true, variants: true },
    });
  }

  async function findAllByCategorySlug(
    categorySlug: string,
    opts?: { orderBy?: SQL },
  ) {
    const category = await dbx.query.categories.findFirst({
      where: and(eq(categories.slug, categorySlug), eq(categories.storeId, storeId)),
      columns: { id: true },
    });
    if (!category) return [];

    return dbx.query.products.findMany({
      where: and(
        eq(products.storeId, storeId),
        eq(products.isActive, true),
        eq(products.categoryId, category.id),
      ),
      orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
      with: { category: true, variants: true },
    });
  }

  function findProductById(id: string) {
    return dbx.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.storeId, storeId)),
    });
  }

  function findBySlug(slug: string) {
    return dbx.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.storeId, storeId)),
      with: { category: true, variants: true },
    });
  }

  function findByIdWithVariants(id: string) {
    return dbx.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.storeId, storeId)),
      with: { variants: true },
    });
  }

  function findBySlugMeta(slug: string) {
    return dbx.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.storeId, storeId)),
      columns: { name: true, description: true },
    });
  }

  function countProducts(where?: {
    isActive?: boolean;
    categoryId?: string;
    search?: string;
  }) {
    const conditions: SQL[] = [eq(products.storeId, storeId)];
    if (where?.isActive !== undefined) {
      conditions.push(eq(products.isActive, where.isActive));
    }
    if (where?.categoryId) {
      conditions.push(eq(products.categoryId, where.categoryId));
    }
    if (where?.search) {
      conditions.push(ilike(products.name, `%${where.search}%`));
    }
    return dbx
      .select({ count: countFn() })
      .from(products)
      .where(and(...conditions))
      .then((r) => r[0].count);
  }

  function findVariantsByProductId(productId: string) {
    return dbx.query.productVariants.findMany({
      where: and(
        eq(productVariants.productId, productId),
        eq(productVariants.isActive, true),
      ),
      orderBy: [asc(productVariants.sortOrder)],
    });
  }

  function findAllVariantsByProductId(productId: string) {
    return dbx.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
      orderBy: [asc(productVariants.sortOrder)],
    });
  }

  function findVariantById(id: string) {
    return dbx.query.productVariants.findFirst({
      where: eq(productVariants.id, id),
    });
  }

  function findBlocksByProduct(productId: string) {
    return dbx.query.availability.findMany({
      where: eq(availability.productId, productId),
      orderBy: [desc(availability.startDate)],
      with: { order: { columns: { id: true, customerName: true } } },
    });
  }

  function findBlockById(id: string) {
    return dbx.query.availability.findFirst({
      where: eq(availability.id, id),
    });
  }

  function findByDateRange(
    productId: string,
    startDate: Date,
    endDate: Date,
    variantId?: string | null,
  ) {
    return findOccupiedQuantity(dbx, {
      productId,
      startDate,
      endDate,
      variantId,
    }).then((occupied) => ({ rows: [{ occupied }] }));
  }

  return {
    findAll,
    findAllWithCategory,
    findAllByCategorySlug,
    findProductById,
    findBySlug,
    findByIdWithVariants,
    findBySlugMeta,
    countProducts,
    findVariantsByProductId,
    findAllVariantsByProductId,
    findVariantById,
    findBlocksByProduct,
    findBlockById,
    findByDateRange,
  };
}

export type ProductsService = ReturnType<typeof createProductsService>;

// ---------------------------------------------------------------------------
// Default production instance — preserves all existing named exports so
// consumers in `app/` and other services keep working without changes.
// ---------------------------------------------------------------------------

const defaultService = createProductsService({ db, storeId: getStoreId() });

export const findAll = defaultService.findAll;
export const findAllWithCategory = defaultService.findAllWithCategory;
export const findAllByCategorySlug = defaultService.findAllByCategorySlug;
export const findProductById = defaultService.findProductById;
export const findBySlug = defaultService.findBySlug;
export const findByIdWithVariants = defaultService.findByIdWithVariants;
export const findBySlugMeta = defaultService.findBySlugMeta;
export const countProducts = defaultService.countProducts;
export const findVariantsByProductId = defaultService.findVariantsByProductId;
export const findAllVariantsByProductId =
  defaultService.findAllVariantsByProductId;
export const findVariantById = defaultService.findVariantById;
export const findBlocksByProduct = defaultService.findBlocksByProduct;
export const findBlockById = defaultService.findBlockById;
export const findByDateRange = defaultService.findByDateRange;
