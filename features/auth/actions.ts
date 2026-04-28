"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { unauthorizedProblem } from "@/lib/problems";
import type { ProblemDetail } from "@/lib/types/problem-detail";

export async function loginAction(
  _prev: ProblemDetail | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/admin/products",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedProblem("Credenciales inválidas");
    }
    throw error;
  }
}
