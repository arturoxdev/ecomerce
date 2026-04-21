import { z } from "zod";

import { priceTypeEnum, products, productVariants } from "@/lib/db/schema";
import { MAX_MEDIA_COUNT } from "@/lib/services/media";
import { toSlug } from "@/lib/utils";

export const productSchema = z.object({
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

export type ProductInput = z.infer<typeof productSchema>;

export const variantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().positive("Price must be positive"),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or more"),
});

export type VariantInput = z.infer<typeof variantSchema>;

export function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
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
  });
}

export function parseVariantForm(formData: FormData) {
  return variantSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    stock: formData.get("stock"),
  });
}

function splitPhotos(photos: string | undefined): string[] {
  if (!photos) return [];
  return photos
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function buildProductInsert(
  input: ProductInput,
  ctx: { storeId: string },
): typeof products.$inferInsert {
  const { photos, basePrice, about, ...rest } = input;
  return {
    ...rest,
    storeId: ctx.storeId,
    slug: toSlug(input.slug),
    about: about || null,
    basePrice: basePrice.toString(),
    photos: splitPhotos(photos),
  };
}

export function buildProductUpdate(
  input: ProductInput,
): Omit<typeof products.$inferInsert, "storeId"> {
  const { photos, basePrice, about, ...rest } = input;
  return {
    ...rest,
    slug: toSlug(input.slug),
    about: about || null,
    basePrice: basePrice.toString(),
    photos: splitPhotos(photos),
  };
}

export function buildVariantInsert(
  input: VariantInput,
  ctx: { productId: string },
): typeof productVariants.$inferInsert {
  return {
    productId: ctx.productId,
    name: input.name,
    price: input.price.toString(),
    stock: input.stock,
  };
}

export function buildVariantUpdate(
  input: VariantInput,
): Pick<typeof productVariants.$inferInsert, "name" | "price" | "stock"> {
  return {
    name: input.name,
    price: input.price.toString(),
    stock: input.stock,
  };
}
