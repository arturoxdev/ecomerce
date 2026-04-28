import { z } from "zod";

export const ZIPCODE_REGEX = /^[A-Za-z0-9]{1,8}$/;
export const CSV_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const CSV_HEADER = "city,zipcode,fee";

const cityField = z
  .string()
  .trim()
  .min(1, "La ciudad es requerida")
  .max(80, "La ciudad no puede exceder 80 caracteres");

const zipcodeField = z
  .string()
  .trim()
  .regex(ZIPCODE_REGEX, "Zipcode debe ser alfanumérico de 1 a 8 caracteres");

const feeField = z.coerce
  .number()
  .min(0, "La tarifa debe ser mayor o igual a 0");

export const zipcodeSchema = z.object({
  city: cityField,
  zipcode: zipcodeField,
  fee: feeField,
});

export type ZipcodeInput = z.infer<typeof zipcodeSchema>;

export function parseZipcodeForm(formData: FormData) {
  return zipcodeSchema.safeParse({
    city: formData.get("city"),
    zipcode: formData.get("zipcode"),
    fee: formData.get("fee"),
  });
}

export const csvRowSchema = zipcodeSchema;

export const bulkImportOptionsSchema = z.object({
  deleteAbsent: z.boolean().default(false),
});
export type BulkImportOptions = z.infer<typeof bulkImportOptionsSchema>;
