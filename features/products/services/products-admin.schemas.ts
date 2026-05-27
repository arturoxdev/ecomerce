import { z } from "zod";

import {
  priceTypeEnum,
  productAdditionalServices,
  products,
  productVariants,
} from "@/lib/db/schema";
import { MAX_MEDIA_COUNT } from "@/lib/services/media";
import { toSlug } from "@/lib/utils";

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  slug: z.string().min(1, "El slug es requerido"),
  description: z
    .string()
    .max(150, "La descripción debe tener 150 caracteres o menos")
    .optional(),
  about: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es requerida"),
  basePrice: z.coerce.number().positive("El precio debe ser positivo"),
  priceType: z.enum(priceTypeEnum.enumValues),
  stock: z.coerce.number().int().min(0, "Las existencias deben ser 0 o mayor"),
  photos: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const urls = val.split("\n").filter(Boolean);
        return urls.length <= MAX_MEDIA_COUNT;
      },
      `Máximo ${MAX_MEDIA_COUNT} archivos permitidos`,
    ),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;

export const variantSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.coerce.number().positive("El precio debe ser positivo"),
  stock: z.coerce.number().int().min(0, "Las existencias deben ser 0 o mayor"),
});

export type VariantInput = z.infer<typeof variantSchema>;

export const localServiceSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  // ADR-009: services are additive, so $0 is a valid price (unlike variants,
  // which replace the base price and must be positive).
  price: z.coerce.number().min(0, "El precio debe ser 0 o mayor"),
  description: z
    .string()
    .max(500, "La descripción debe tener 500 caracteres o menos")
    .optional(),
  isActive: z.boolean().default(true),
});

export type LocalServiceInput = z.infer<typeof localServiceSchema>;

export type LocalService = {
  id: string;
  name: string;
  price: string;
  description: string | null;
  isActive: boolean;
};

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

export function parseLocalServiceForm(formData: FormData) {
  return localServiceSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") === "true",
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

export function buildLocalServiceInsert(
  input: LocalServiceInput,
  ctx: { productId: string },
): typeof productAdditionalServices.$inferInsert {
  return {
    productId: ctx.productId,
    name: input.name,
    price: input.price.toString(),
    description: input.description || null,
    isActive: input.isActive,
  };
}

export function buildLocalServiceUpdate(
  input: LocalServiceInput,
): Pick<
  typeof productAdditionalServices.$inferInsert,
  "name" | "price" | "description" | "isActive"
> {
  return {
    name: input.name,
    price: input.price.toString(),
    description: input.description || null,
    isActive: input.isActive,
  };
}
