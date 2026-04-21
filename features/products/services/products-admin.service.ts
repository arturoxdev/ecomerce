import "server-only";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  findAllVariantsByProductId,
  findBlockById,
  findBlocksByProduct,
  findProductById,
  findVariantById,
} from "./products.service";
import {
  buildProductInsert,
  buildProductUpdate,
  buildVariantInsert,
  buildVariantUpdate,
  parseProductForm,
  parseVariantForm,
} from "./products-admin.schemas";
import { parseAndValidateManualBlock } from "./manual-block.service";
import { requireWriteAccess } from "@/lib/services/auth";
import { db } from "@/lib/db";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/errors";
import { availability, products, productVariants } from "@/lib/db/schema";
import { MAX_MEDIA_COUNT } from "@/lib/services/media";
import { s3Bucket, s3Client, s3PublicUrl } from "@/lib/services/s3-client";
import {
  foreignKeyViolationProblem,
  internalProblem,
  notFoundProblem,
  uniqueViolationProblem,
  validationProblem,
} from "@/lib/problems";
import { checkAvailability } from "@/lib/services/availability.service";
import { getObjectKeyFromPublicMediaUrl } from "@/lib/services/media-url.service";
import type { FormState } from "@/lib/types/form-state";
import type { ProblemDetail } from "@/lib/types/problem-detail";

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
// Types
// ---------------------------------------------------------------------------

export type ProductFormState = FormState;
export type VariantFormState = FormState;
export type ManualBlockFormState = FormState;

// ---------------------------------------------------------------------------
// Product mutations
// ---------------------------------------------------------------------------

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireWriteAccess();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    await db
      .insert(products)
      .values(buildProductInsert(parsed.data, { storeId: user.storeId }))
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

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    await db
      .update(products)
      .set(buildProductUpdate(parsed.data))
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
  const key = getObjectKeyFromPublicMediaUrl(url, s3PublicUrl);
  if (key) {
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

export async function deleteProduct(id: string): Promise<ProductFormState> {
  await requireWriteAccess();
  try {
    await db.delete(products).where(eq(products.id, id));
  } catch (e: unknown) {
    if (isForeignKeyViolation(e)) {
      return foreignKeyViolationProblem(
        "Cannot delete: product has associated orders",
      );
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

  const parsed = parseVariantForm(formData);
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
      .values(buildVariantInsert(parsed.data, { productId }))
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

  const parsed = parseVariantForm(formData);
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
      .set(buildVariantUpdate(parsed.data))
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

export function checkOverlapAndCreate(
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number,
  stock: number,
  extra?: { reason?: string; variantId?: string | null; orderId?: string | null },
) {
  const variantId = extra?.variantId ?? null;

  return db.transaction(async (tx) => {
    const availabilityCheck = await checkAvailability(tx, {
      productId,
      startDate,
      endDate,
      quantity,
      stock,
      variantId,
    });

    if (!availabilityCheck.isAvailable) {
      return { ok: false as const, occupied: availabilityCheck.occupied };
    }

    const [block] = await tx
      .insert(availability)
      .values({
        productId,
        startDate,
        endDate,
        quantity,
        orderId: extra?.orderId ?? null,
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

  const check = parseAndValidateManualBlock(formData);
  if (!check.ok) {
    return check.problem;
  }

  const { startDate, endDate, reason } = check.data;

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
    return foreignKeyViolationProblem(
      "Cannot delete reservations associated with orders",
    );
  }

  await db.delete(availability).where(eq(availability.id, blockId));

  revalidatePath(`/admin/products/${block.productId}/availability`);
  return { success: true };
}

export async function getProductBlocks(productId: string) {
  return findBlocksByProduct(productId);
}
