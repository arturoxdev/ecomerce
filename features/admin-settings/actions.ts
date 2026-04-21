"use server";

import { updateSettings as dalUpdate } from "./data";
import type { SettingsFormState } from "./data";

export async function updateSettingsAction(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  return dalUpdate(prev, formData);
}
