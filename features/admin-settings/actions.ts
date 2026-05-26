"use server";

import {
  updateDeliverySettings as dalUpdateDelivery,
  updatePaymentSettings as dalUpdatePayment,
} from "./data";
import type { SettingsFormState } from "./data";

export async function updatePaymentSettingsAction(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  return dalUpdatePayment(prev, formData);
}

export async function updateDeliverySettingsAction(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  return dalUpdateDelivery(prev, formData);
}
