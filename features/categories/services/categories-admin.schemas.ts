import { z } from "zod";

import { categories } from "@/lib/db/schema";
import { toSlug } from "@/lib/utils";

export const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug debe estar en minúsculas, sin espacios ni caracteres especiales",
    ),
  description: z.string().optional(),
  // ADR-015: optional English copy; empty means "fall back to Spanish".
  nameEn: z.string().optional(),
  descriptionEn: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const reorderSchema = z.array(
  z.object({
    id: z.string().min(1),
    sortOrder: z.number().int().min(0),
  }),
);

export type ReorderInput = z.infer<typeof reorderSchema>;

function optionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim().length > 0 ? value : undefined;
}

export function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    nameEn: optionalText(formData.get("nameEn")),
    descriptionEn: optionalText(formData.get("descriptionEn")),
  });
}

// Blank English copy is stored as NULL so the storefront falls back to Spanish
// and clearing a translation in the admin actually removes it.
function englishColumns(input: CategoryInput) {
  return {
    nameEn: input.nameEn?.trim() || null,
    descriptionEn: input.descriptionEn?.trim() || null,
  };
}

export function buildCategoryInsert(
  input: CategoryInput,
  ctx: { storeId: string; sortOrder: number },
): typeof categories.$inferInsert {
  return {
    ...input,
    ...englishColumns(input),
    slug: toSlug(input.slug),
    sortOrder: ctx.sortOrder,
    storeId: ctx.storeId,
  };
}

export function buildCategoryUpdate(
  input: CategoryInput,
): Pick<
  typeof categories.$inferInsert,
  "name" | "slug" | "description" | "nameEn" | "descriptionEn"
> {
  return {
    name: input.name,
    slug: toSlug(input.slug),
    description: input.description,
    ...englishColumns(input),
  };
}
