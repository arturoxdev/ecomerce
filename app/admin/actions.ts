"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAdmin(
  _prev: { error: string } | undefined,
  formData: FormData,
) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (username === "admin" && password === "password") {
    const cookieStore = await cookies();
    cookieStore.set("admin-session", "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
    redirect("/admin/products");
  }

  return { error: "Invalid credentials" };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin-session");
  redirect("/admin/login");
}
