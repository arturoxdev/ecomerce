import { z } from "zod";

import { categories } from "@/lib/db/schema";
import { toSlug } from "@/lib/utils";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase, no spaces or special characters",
    ),
  description: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const reorderSchema = z.array(
  z.object({
    id: z.string().min(1),
    sortOrder: z.number().int().min(0),
  }),
);

export type ReorderInput = z.infer<typeof reorderSchema>;

export function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
  });
}

export function buildCategoryInsert(
  input: CategoryInput,
  ctx: { storeId: string; sortOrder: number },
): typeof categories.$inferInsert {
  return {
    ...input,
    slug: toSlug(input.slug),
    sortOrder: ctx.sortOrder,
    storeId: ctx.storeId,
  };
}

export function buildCategoryUpdate(
  input: CategoryInput,
): Pick<typeof categories.$inferInsert, "name" | "slug" | "description"> {
  return {
    name: input.name,
    slug: toSlug(input.slug),
    description: input.description,
  };
}
