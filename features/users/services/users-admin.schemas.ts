import { z } from "zod";

import { userRoleEnum } from "@/lib/db/schema";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(userRoleEnum.enumValues),
  isActive: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
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
