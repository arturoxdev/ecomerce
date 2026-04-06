"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { requireWriteAccess } from "@/lib/auth/session";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/errors";
import { priceTypeEnum } from "@/lib/db/schema";
import { MAX_MEDIA_COUNT } from "@/lib/media";
import { s3Bucket, s3Client, s3PublicUrl } from "@/lib/minio";
import { revalidateProductEdit, revalidateProductPages } from "@/lib/revalidation";
import * as availabilityRepo from "@/lib/repositories/availability";
import * as productRepo from "@/lib/repositories/product";
import * as variantRepo from "@/lib/repositories/variant";
import type { FormState } from "@/lib/types/form-state";
import { toSlug } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().max(150, "Description must be 150 characters or less").optional(),
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

export type ProductFormState = FormState;

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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { photos, basePrice, about, ...data } = parsed.data;

  try {
    await productRepo.create({
      ...data,
      slug: toSlug(data.slug),
      about: about || null,
      basePrice: basePrice.toString(),
      photos: photos ? photos.split("\n").map((p) => p.trim()).filter(Boolean) : [],
    });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return { fieldErrors: { slug: ["Slug already exists"] } };
    }
    return { error: "Failed to create product" };
  }

  revalidateProductPages();
  redirect("/admin/products");
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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { photos, basePrice, about, ...data } = parsed.data;

  try {
    await productRepo.update(id, {
      ...data,
      slug: toSlug(data.slug),
      about: about || null,
      basePrice: basePrice.toString(),
      photos: photos ? photos.split("\n").map((p) => p.trim()).filter(Boolean) : [],
    });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return { fieldErrors: { slug: ["Slug already exists"] } };
    }
    return { error: "Failed to update product" };
  }

  revalidateProductPages();
  revalidateProductEdit(id);
  return { success: true };
}

// --- Media Actions ---

export async function appendProductPhoto(
  productId: string,
  url: string,
): Promise<{ photos?: string[]; error?: string }> {
  await requireWriteAccess();
  const product = await productRepo.findById(productId);
  if (!product) return { error: "Product not found" };
  if (product.photos.length >= MAX_MEDIA_COUNT) {
    return { error: `Maximum ${MAX_MEDIA_COUNT} files allowed` };
  }

  const result = await productRepo.appendPhoto(productId, url);
  if (!result) return { error: "Failed to add media" };

  revalidateProductPages();
  revalidateProductEdit(productId);
  return { photos: result.photos };
}

export async function removeProductPhoto(
  productId: string,
  url: string,
): Promise<{ photos?: string[]; error?: string }> {
  await requireWriteAccess();

  const result = await productRepo.removePhoto(productId, url);
  if (!result) return { error: "Failed to remove media" };

  // Delete from R2 (best-effort)
  const prefix = s3PublicUrl.endsWith("/") ? s3PublicUrl : `${s3PublicUrl}/`;
  if (url.startsWith(prefix)) {
    const key = url.slice(prefix.length);
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }));
    } catch (err) {
      console.error("[removeProductPhoto] Failed to delete from R2:", err);
    }
  }

  revalidateProductPages();
  revalidateProductEdit(productId);
  return { photos: result.photos };
}

// --- Manual Block Actions ---

const manualBlockSchema = z.object({
  startDate: z.coerce.date().refine((d) => d >= new Date(new Date().toDateString()), {
    message: "Start date cannot be in the past",
  }),
  endDate: z.coerce.date(),
  reason: z.string().max(255).optional(),
});

export type ManualBlockFormState = FormState;

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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { startDate, endDate, reason } = parsed.data;

  if (endDate <= startDate) {
    return { fieldErrors: { endDate: ["End date must be after start date"] } };
  }

  const product = await productRepo.findById(productId);
  if (!product) {
    return { error: "Product not found" };
  }

  const result = await availabilityRepo.checkOverlapAndCreate(
    productId,
    startDate,
    endDate,
    1,
    product.stock,
    { reason },
  );

  if (!result.ok) {
    return { error: "No stock available for the selected dates" };
  }

  revalidatePath(`/admin/products/${productId}/availability`);
  return { success: true };
}

export async function deleteManualBlock(blockId: string): Promise<ManualBlockFormState> {
  await requireWriteAccess();
  const block = await availabilityRepo.findBlockById(blockId);
  if (!block) {
    return { error: "Block not found" };
  }
  if (block.orderId !== null) {
    return { error: "Cannot delete reservations associated with orders" };
  }

  await availabilityRepo.deleteBlock(blockId);

  revalidatePath(`/admin/products/${block.productId}/availability`);
  return { success: true };
}

export async function getProductBlocks(productId: string) {
  return availabilityRepo.findByProduct(productId);
}

// --- Product State ---

export async function toggleProductActive(productId: string): Promise<ProductFormState> {
  await requireWriteAccess();
  const product = await productRepo.findById(productId);
  if (!product) {
    return { error: "Product not found" };
  }

  try {
    await productRepo.toggleActive(productId, product.isActive);
  } catch {
    return { error: "Failed to toggle product status" };
  }

  revalidateProductPages();
  return { success: true };
}

// --- Product CRUD ---

export async function deleteProduct(id: string): Promise<ProductFormState> {
  await requireWriteAccess();
  try {
    await productRepo.remove(id);
  } catch (e: unknown) {
    if (isForeignKeyViolation(e)) {
      return { error: "Cannot delete: product has associated orders" };
    }
    return { error: "Failed to delete product" };
  }

  revalidateProductPages();
  return { success: true };
}

// --- Variant Actions ---

const variantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().positive("Price must be positive"),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or more"),
});

export type VariantFormState = FormState;

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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const product = await productRepo.findById(productId);
  if (!product) {
    return { error: "Product not found" };
  }

  try {
    await variantRepo.create({
      productId,
      name: parsed.data.name,
      price: parsed.data.price.toString(),
      stock: parsed.data.stock,
    });
  } catch {
    return { error: "Failed to create variant" };
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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const variant = await variantRepo.findById(variantId);
  if (!variant) {
    return { error: "Variant not found" };
  }

  try {
    await variantRepo.update(variantId, {
      name: parsed.data.name,
      price: parsed.data.price.toString(),
      stock: parsed.data.stock,
    });
  } catch {
    return { error: "Failed to update variant" };
  }

  revalidateProductEdit(variant.productId);
  return { success: true };
}

export async function deleteVariant(variantId: string): Promise<VariantFormState> {
  await requireWriteAccess();
  const variant = await variantRepo.findById(variantId);
  if (!variant) {
    return { error: "Variant not found" };
  }

  try {
    await variantRepo.remove(variantId);
  } catch {
    return { error: "Failed to delete variant" };
  }

  revalidateProductEdit(variant.productId);
  return { success: true };
}

export async function getProductVariants(productId: string) {
  return variantRepo.findAllByProductId(productId);
}
