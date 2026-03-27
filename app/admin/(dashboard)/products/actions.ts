"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireWriteAccess } from "@/lib/auth/session";
import { priceTypeEnum } from "@/lib/db/schema";
import * as availabilityRepo from "@/lib/repositories/availability";
import * as productRepo from "@/lib/repositories/product";
import * as variantRepo from "@/lib/repositories/variant";
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
  photos: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type ProductFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createProduct(
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
    await productRepo.create({
      ...data,
      slug: toSlug(data.slug),
      about: about || null,
      basePrice: basePrice.toString(),
      photos: photos ? photos.split("\n").map((p) => p.trim()).filter(Boolean) : [],
    });
  } catch (e: unknown) {
    if (hasCode(e, "23505")) {
      return { fieldErrors: { slug: ["Slug already exists"] } };
    }
    return { error: "Failed to create product" };
  }

  revalidatePath("/admin/products");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/catalog", "page");
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
    if (hasCode(e, "23505")) {
      return { fieldErrors: { slug: ["Slug already exists"] } };
    }
    return { error: "Failed to update product" };
  }

  revalidatePath("/admin/products");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/catalog", "page");
  redirect("/admin/products");
}

// --- Manual Block Actions ---

const manualBlockSchema = z.object({
  startDate: z.coerce.date().refine((d) => d >= new Date(new Date().toDateString()), {
    message: "Start date cannot be in the past",
  }),
  endDate: z.coerce.date(),
  reason: z.string().max(255).optional(),
});

export type ManualBlockFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

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

  revalidatePath("/admin/products");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/catalog", "page");
  return { success: true };
}

// --- Product CRUD ---

export async function deleteProduct(id: string): Promise<ProductFormState> {
  await requireWriteAccess();
  try {
    await productRepo.remove(id);
  } catch (e: unknown) {
    if (hasCode(e, "23503")) {
      return { error: "Cannot delete: product has associated orders" };
    }
    return { error: "Failed to delete product" };
  }

  revalidatePath("/admin/products");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/catalog", "page");
  return { success: true };
}

// --- Variant Actions ---

const variantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().positive("Price must be positive"),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or more"),
});

export type VariantFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

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

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/[locale]/catalog", "page");
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

  revalidatePath(`/admin/products/${variant.productId}/edit`);
  revalidatePath("/[locale]/catalog", "page");
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

  revalidatePath(`/admin/products/${variant.productId}/edit`);
  revalidatePath("/[locale]/catalog", "page");
  return { success: true };
}

export async function getProductVariants(productId: string) {
  return variantRepo.findAllByProductId(productId);
}

// --- Helpers ---

function hasCode(e: unknown, code: string): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === code;
}
