"use server";

import { PriceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  basePrice: z.coerce.number().positive("Price must be positive"),
  priceType: z.nativeEnum(PriceType),
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
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
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

  const { photos, ...data } = parsed.data;

  try {
    await db.product.create({
      data: {
        ...data,
        photos: photos ? photos.split("\n").map((p) => p.trim()).filter(Boolean) : [],
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { fieldErrors: { slug: ["Slug already exists"] } };
    }
    return { error: "Failed to create product" };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
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

  const { photos, ...data } = parsed.data;

  try {
    await db.product.update({
      where: { id },
      data: {
        ...data,
        photos: photos ? photos.split("\n").map((p) => p.trim()).filter(Boolean) : [],
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { fieldErrors: { slug: ["Slug already exists"] } };
    }
    return { error: "Failed to update product" };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProduct(id: string): Promise<ProductFormState> {
  try {
    await db.product.delete({ where: { id } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("Foreign key constraint") || msg.includes("Restrict")) {
      return { error: "Cannot delete: product has associated orders" };
    }
    return { error: "Failed to delete product" };
  }

  revalidatePath("/admin/products");
  return { success: true };
}
