"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setThemeId } from "@/lib/data/settings";
import { internalProblem, validationProblem } from "@/lib/problems";
import { THEMES } from "@/lib/themes";

const themeIds = THEMES.map((t) => t.id) as [string, ...string[]];

const UpdateThemeSchema = z.object({
  themeId: z.enum(themeIds),
});

export async function updateTheme(formData: FormData) {
  const parsed = UpdateThemeSchema.safeParse({
    themeId: formData.get("themeId"),
  });

  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    await setThemeId(parsed.data.themeId);
  } catch {
    return internalProblem("Failed to update theme");
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { success: true as const };
}
