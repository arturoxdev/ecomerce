import { z } from "zod";

import { THEMES } from "@/lib/themes";

const themeIds = THEMES.map((theme) => theme.id) as [string, ...string[]];

export const updateThemeSchema = z.object({
  themeId: z.enum(themeIds),
});

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

export function parseUpdateThemeForm(formData: FormData) {
  return updateThemeSchema.safeParse({
    themeId: formData.get("themeId"),
  });
}
