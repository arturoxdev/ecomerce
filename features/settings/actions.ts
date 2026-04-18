"use server";

import { updateTheme as updateThemeBase } from "./services/settings-admin.service";

export async function updateTheme(formData: FormData) {
  return updateThemeBase(formData);
}
