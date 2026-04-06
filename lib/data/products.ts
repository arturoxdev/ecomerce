import "server-only";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  and,
  asc,
  count as countFn,
  desc,
  eq,
  ilike,
  sql,
  SQL,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireWriteAccess } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/errors";
import {
  availability,
  categories,
  priceTypeEnum,
  products,
  productVariants,
} from "@/lib/db/schema";
import { MAX_MEDIA_COUNT } from "@/lib/media";
import { s3Bucket, s3Client, s3PublicUrl } from "@/lib/minio";
import {
  validationProblem,
  uniqueViolationProblem,
  foreignKeyViolationProblem,
  notFoundProblem,
  internalProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";
import type { ProblemDetail } from "@/lib/types/problem-detail";
import { toSlug } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z
    .string()
    .max(150, "Description must be 150 characters or less")
    .optional(),
  about: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  basePrice: z.coerce.number().positive("Price must be positive"),
  priceType: z.enum(priceTypeEnum.enumValues),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or more"),
  photos: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const urls = val.split("\n").filter(Boolean);
        return urls.length <= MAX_MEDIA_COUNT;
      },
      `Maximum ${MAX_MEDIA_COUNT} files allowed`,
    ),
  isActive: z.boolean().default(true),
});

const variantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().positive("Price must be positive"),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or more"),
});

const manualBlockSchema = z.object({
  startDate: z.coerce.date().refine(
    (d) => d >= new Date(new Date().toDateString()),
    { message: "Start date cannot be in the past" },
  ),
  endDate: z.coerce.date(),
  reason: z.string().max(255).optional(),
});

// ---------------------------------------------------------------------------
// Revalidation helpers
// ---------------------------------------------------------------------------

function revalidateProductPages() {
  revalidatePath("/admin/products");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/catalog", "page");
}

function revalidateProductEdit(productId: string) {
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/[locale]/catalog", "page");
}

// ---------------------------------------------------------------------------
// Product reads
// ---------------------------------------------------------------------------

export function findAll(opts?: {
  where?: { isActive?: boolean };
  orderBy?: SQL;
  limit?: number;
  offset?: number;
}) {
  const conditions: SQL[] = [];
  if (opts?.where?.isActive !== undefined) {
    conditions.push(eq(products.isActive, opts.where.isActive));
  }

  return db.query.products.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
    offset: opts?.offset,
  });
}

export function findAllWithCategory(opts?: {
  where?: { isActive?: boolean; categoryId?: string; search?: string };
  orderBy?: SQL;
  limit?: number;
  offset?: number;
}) {
  const conditions: SQL[] = [];
  if (opts?.where?.isActive !== undefined) {
    conditions.push(eq(products.isActive, opts.where.isActive));
  }
  if (opts?.where?.categoryId) {
    conditions.push(eq(products.categoryId, opts.where.categoryId));
  }
  if (opts?.where?.search) {
    conditions.push(ilike(products.name, `%${opts.where.search}%`));
  }

  return db.query.products.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
    offset: opts?.offset,
    with: { category: true, variants: true },
  });
}

export async function findAllByCategorySlug(
  categorySlug: string,
  opts?: { orderBy?: SQL },
) {
  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, categorySlug),
    columns: { id: true },
  });
  if (!category) return [];

  return db.query.products.findMany({
    where: and(
      eq(products.isActive, true),
      eq(products.categoryId, category.id),
    ),
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    with: { category: true, variants: true },
  });
}

export function findProductById(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
  });
}

export function findBySlug(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true, variants: true },
  });
}

export function findByIdWithVariants(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: { variants: true },
  });
}

export function findBySlugMeta(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    columns: { name: true, description: true },
  });
}

export function countProducts(where?: {
  isActive?: boolean;
  categoryId?: string;
  search?: string;
}) {
  const conditions: SQL[] = [];
  if (where?.isActive !== undefined) {
    conditions.push(eq(products.isActive, where.isActive));
  }
  if (where?.categoryId) {
    conditions.push(eq(products.categoryId, where.categoryId));
  }
  if (where?.search) {
    conditions.push(ilike(products.name, `%${where.search}%`));
  }
  return db
    .select({ count: countFn() })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .then((r) => r[0].count);
}

// ---------------------------------------------------------------------------
// Variant reads
// ---------------------------------------------------------------------------

export function findVariantsByProductId(productId: string) {
  return db.query.productVariants.findMany({
    where: and(
      eq(productVariants.productId, productId),
      eq(productVariants.isActive, true),
    ),
    orderBy: [asc(productVariants.sortOrder)],
  });
}

export function findAllVariantsByProductId(productId: string) {
  return db.query.productVariants.findMany({
    where: eq(productVariants.productId, productId),
    orderBy: [asc(productVariants.sortOrder)],
  });
}

export function findVariantById(id: string) {
  return db.query.productVariants.findFirst({
    where: eq(productVariants.id, id),
  });
}

// ---------------------------------------------------------------------------
// Availability reads
// ---------------------------------------------------------------------------

export function findBlocksByProduct(productId: string) {
  return db.query.availability.findMany({
    where: eq(availability.productId, productId),
    orderBy: [desc(availability.startDate)],
    with: { order: { columns: { id: true, customerName: true } } },
  });
}

export function findBlockById(id: string) {
  return db.query.availability.findFirst({
    where: eq(availability.id, id),
  });
}

export function findByDateRange(
  productId: string,
  startDate: Date,
  endDate: Date,
  variantId?: string | null,
) {
  if (variantId) {
    return db.execute<{ occupied: number }>(sql`
      SELECT COALESCE(SUM(quantity), 0)::int AS occupied
      FROM availability
      WHERE product_id = ${productId}::uuid
        AND variant_id = ${variantId}::uuid
        AND start_date < ${endDate}::timestamp
        AND end_date > ${startDate}::timestamp
    `);
  }
  return db.execute<{ occupied: number }>(sql`
    SELECT COALESCE(SUM(quantity), 0)::int AS occupied
    FROM availability
    WHERE product_id = ${productId}::uuid
      AND variant_id IS NULL
      AND start_date < ${endDate}::timestamp
      AND end_date > ${startDate}::timestamp
  `);
}

// ---------------------------------------------------------------------------
// Product mutations
// ---------------------------------------------------------------------------

export type ProductFormState = FormState;
export type VariantFormState = FormState;
export type ManualBlockFormState = FormState;

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireWriteAccess();
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    about: formData.get("about") || undefined,
    categoryId: formData.get("categoryId"),
    basePrice: formData.get("basePrice"),
    priceType: formData.get("priceType"),
    stock: formData.get("stock"),
    photos: formData.get("photos") || undefined,
    isActive: formData.get("isActive") === "true",
  };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  const { photos, basePrice, about, ...data } = parsed.data;

  try {
    await db
      .insert(products)
      .values({
        ...data,
        storeId: user.storeId,
        slug: toSlug(data.slug),
        about: about || null,
        basePrice: basePrice.toString(),
        photos: photos
          ? photos
              .split("\n")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
      })
      .returning()
      .then((r) => r[0]);
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return uniqueViolationProblem("slug", "Slug already exists");
    }
    return internalProblem("Failed to create product");
  }

  revalidateProductPages();
  return { success: true };
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireWriteAccess();
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    about: formData.get("about") || undefined,
    categoryId: formData.get("categoryId"),
    basePrice: formData.get("basePrice"),
    priceType: formData.get("priceType"),
    stock: formData.get("stock"),
    photos: formData.get("photos") || undefined,
    isActive: formData.get("isActive") === "true",
  };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  const { photos, basePrice, about, ...data } = parsed.data;

  try {
    await db
      .update(products)
      .set({
        ...data,
        slug: toSlug(data.slug),
        about: about || null,
        basePrice: basePrice.toString(),
        photos: photos
          ? photos
              .split("\n")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
      })
      .where(eq(products.id, id))
      .returning()
      .then((r) => r[0]);
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return uniqueViolationProblem("slug", "Slug already exists");
    }
    return internalProblem("Failed to update product");
  }

  revalidateProductPages();
  revalidateProductEdit(id);
  return { success: true };
}

export async function appendProductPhoto(
  productId: string,
  url: string,
): Promise<{ photos: string[] } | ProblemDetail> {
  await requireWriteAccess();
  const product = await findProductById(productId);
  if (!product) return notFoundProblem("Product not found");
  if (product.photos.length >= MAX_MEDIA_COUNT) {
    return internalProblem(`Maximum ${MAX_MEDIA_COUNT} files allowed`);
  }

  const result = await db
    .update(products)
    .set({ photos: sql`array_append(${products.photos}, ${url})` })
    .where(eq(products.id, productId))
    .returning({ photos: products.photos })
    .then((r) => r[0]);

  if (!result) return internalProblem("Failed to add media");

  revalidateProductPages();
  revalidateProductEdit(productId);
  return { photos: result.photos };
}

export async function removeProductPhoto(
  productId: string,
  url: string,
): Promise<{ photos: string[] } | ProblemDetail> {
  await requireWriteAccess();

  const result = await db
    .update(products)
    .set({ photos: sql`array_remove(${products.photos}, ${url})` })
    .where(eq(products.id, productId))
    .returning({ photos: products.photos })
    .then((r) => r[0]);

  if (!result) return internalProblem("Failed to remove media");

  // Delete from R2 (best-effort)
  const prefix = s3PublicUrl.endsWith("/") ? s3PublicUrl : `${s3PublicUrl}/`;
  if (url.startsWith(prefix)) {
    const key = url.slice(prefix.length);
    try {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }),
      );
    } catch (err) {
      console.error("[removeProductPhoto] Failed to delete from R2:", err);
    }
  }

  revalidateProductPages();
  revalidateProductEdit(productId);
  return { photos: result.photos };
}

export async function toggleProductActive(
  productId: string,
): Promise<ProductFormState> {
  await requireWriteAccess();
  const product = await findProductById(productId);
  if (!product) {
    return notFoundProblem("Product not found");
  }

  try {
    await db
      .update(products)
      .set({ isActive: !product.isActive })
      .where(eq(products.id, productId));
  } catch {
    return internalProblem("Failed to toggle product status");
  }

  revalidateProductPages();
  return { success: true };
}

export async function deleteProduct(
  id: string,
): Promise<ProductFormState> {
  await requireWriteAccess();
  try {
    await db.delete(products).where(eq(products.id, id));
  } catch (e: unknown) {
    if (isForeignKeyViolation(e)) {
      return foreignKeyViolationProblem("Cannot delete: product has associated orders");
    }
    return internalProblem("Failed to delete product");
  }

  revalidateProductPages();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Variant mutations
// ---------------------------------------------------------------------------

export async function createVariant(
  productId: string,
  _prev: VariantFormState,
  formData: FormData,
): Promise<VariantFormState> {
  await requireWriteAccess();
  const raw = {
    name: formData.get("name"),
    price: formData.get("price"),
    stock: formData.get("stock"),
  };

  const parsed = variantSchema.safeParse(raw);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  const product = await findProductById(productId);
  if (!product) {
    return notFoundProblem("Product not found");
  }

  try {
    await db
      .insert(productVariants)
      .values({
        productId,
        name: parsed.data.name,
        price: parsed.data.price.toString(),
        stock: parsed.data.stock,
      })
      .returning()
      .then((r) => r[0]);
  } catch {
    return internalProblem("Failed to create variant");
  }

  revalidateProductEdit(productId);
  return { success: true };
}

export async function updateVariant(
  variantId: string,
  _prev: VariantFormState,
  formData: FormData,
): Promise<VariantFormState> {
  await requireWriteAccess();
  const raw = {
    name: formData.get("name"),
    price: formData.get("price"),
    stock: formData.get("stock"),
  };

  const parsed = variantSchema.safeParse(raw);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  const variant = await findVariantById(variantId);
  if (!variant) {
    return notFoundProblem("Variant not found");
  }

  try {
    await db
      .update(productVariants)
      .set({
        name: parsed.data.name,
        price: parsed.data.price.toString(),
        stock: parsed.data.stock,
      })
      .where(eq(productVariants.id, variantId))
      .returning()
      .then((r) => r[0]);
  } catch {
    return internalProblem("Failed to update variant");
  }

  revalidateProductEdit(variant.productId);
  return { success: true };
}

export async function deleteVariant(
  variantId: string,
): Promise<VariantFormState> {
  await requireWriteAccess();
  const variant = await findVariantById(variantId);
  if (!variant) {
    return notFoundProblem("Variant not found");
  }

  try {
    await db.delete(productVariants).where(eq(productVariants.id, variantId));
  } catch {
    return internalProblem("Failed to delete variant");
  }

  revalidateProductEdit(variant.productId);
  return { success: true };
}

export async function getProductVariants(productId: string) {
  return findAllVariantsByProductId(productId);
}

// ---------------------------------------------------------------------------
// Availability mutations
// ---------------------------------------------------------------------------

function firstOccupiedRow(result: { rows: { occupied: number }[] }) {
  return result.rows[0]?.occupied ?? 0;
}

export function checkOverlapAndCreate(
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number,
  stock: number,
  extra?: { reason?: string; variantId?: string | null },
) {
  const variantId = extra?.variantId ?? null;

  return db.transaction(async (tx) => {
    const result = variantId
      ? await tx.execute<{ occupied: number }>(sql`
          SELECT COALESCE(SUM(quantity), 0)::int AS occupied
          FROM availability
          WHERE product_id = ${productId}::uuid
            AND variant_id = ${variantId}::uuid
            AND start_date < ${endDate}::timestamp
            AND end_date > ${startDate}::timestamp
        `)
      : await tx.execute<{ occupied: number }>(sql`
          SELECT COALESCE(SUM(quantity), 0)::int AS occupied
          FROM availability
          WHERE product_id = ${productId}::uuid
            AND variant_id IS NULL
            AND start_date < ${endDate}::timestamp
            AND end_date > ${startDate}::timestamp
        `);
    const occupied = Number(firstOccupiedRow(result));

    if (occupied + quantity > stock) {
      return { ok: false as const, occupied };
    }

    const [block] = await tx
      .insert(availability)
      .values({
        productId,
        startDate,
        endDate,
        quantity,
        orderId: null,
        ...(variantId ? { variantId } : {}),
        ...(extra?.reason ? { reason: extra.reason } : {}),
      })
      .returning();

    return { ok: true as const, block };
  });
}

export async function createManualBlock(
  productId: string,
  _prev: ManualBlockFormState,
  formData: FormData,
): Promise<ManualBlockFormState> {
  await requireWriteAccess();
  const raw = {
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || undefined,
  };

  const parsed = manualBlockSchema.safeParse(raw);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  const { startDate, endDate, reason } = parsed.data;

  if (endDate <= startDate) {
    return {
      type: "/problems/validation-error",
      status: 422,
      title: "Validation failed",
      detail: "End date must be after start date",
      fieldErrors: { endDate: ["End date must be after start date"] },
    };
  }

  const product = await findProductById(productId);
  if (!product) {
    return notFoundProblem("Product not found");
  }

  const result = await checkOverlapAndCreate(
    productId,
    startDate,
    endDate,
    1,
    product.stock,
    { reason },
  );

  if (!result.ok) {
    return internalProblem("No stock available for the selected dates");
  }

  revalidatePath(`/admin/products/${productId}/availability`);
  return { success: true };
}

export async function deleteManualBlock(
  blockId: string,
): Promise<ManualBlockFormState> {
  await requireWriteAccess();
  const block = await findBlockById(blockId);
  if (!block) {
    return notFoundProblem("Block not found");
  }
  if (block.orderId !== null) {
    return foreignKeyViolationProblem("Cannot delete reservations associated with orders");
  }

  await db.delete(availability).where(eq(availability.id, blockId));

  revalidatePath(`/admin/products/${block.productId}/availability`);
  return { success: true };
}

export async function getProductBlocks(productId: string) {
  return findBlocksByProduct(productId);
}
