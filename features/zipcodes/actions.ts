"use server";

import {
  bulkImportZipcodes as dalBulkImport,
  createZipcode as dalCreate,
  deleteZipcode as dalDelete,
  updateZipcode as dalUpdate,
  type BulkImportFormState,
  type ZipcodeFormState,
} from "./services/zipcodes-admin.service";

export async function createZipcode(
  prev: ZipcodeFormState,
  formData: FormData,
): Promise<ZipcodeFormState> {
  return dalCreate(prev, formData);
}

export async function updateZipcode(
  id: string,
  prev: ZipcodeFormState,
  formData: FormData,
): Promise<ZipcodeFormState> {
  return dalUpdate(id, prev, formData);
}

export async function deleteZipcode(id: string): Promise<ZipcodeFormState> {
  return dalDelete(id);
}

export async function bulkImportZipcodes(
  prev: BulkImportFormState,
  formData: FormData,
): Promise<BulkImportFormState> {
  return dalBulkImport(prev, formData);
}
