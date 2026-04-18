import "server-only";

import { revalidatePath } from "next/cache";

import { parseUpdateThemeForm } from "./settings-admin.schemas";
import { setThemeId } from "@/lib/data/settings";
import { internalProblem, validationProblem } from "@/lib/problems";

export async function updateTheme(formData: FormData) {
  const parsed = parseUpdateThemeForm(formData);

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
