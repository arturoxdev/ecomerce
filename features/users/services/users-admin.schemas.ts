import { z } from "zod";

import { userRoleEnum } from "@/lib/db/schema";

export const createUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("El correo electrónico no es válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(userRoleEnum.enumValues),
  isActive: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("El correo electrónico no es válido"),
  role: z.enum(userRoleEnum.enumValues),
  isActive: z.boolean().default(true),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export function parseCreateUserForm(formData: FormData) {
  return createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
  });
}

export function parseUpdateUserForm(formData: FormData) {
  return updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
  });
}
