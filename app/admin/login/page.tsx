"use client";

import { Lock } from "lucide-react";
import { useActionState } from "react";

import { loginAction } from "@/app/admin/login/actions";
import { siteConfig } from "@/lib/config/site";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7f5]">
      <div className="w-full max-w-[420px] rounded-[20px] border border-[#f1f5f9] bg-white p-10 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#f28b0d]">
            <Lock className="size-[26px] text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">
            {siteConfig.adminTitle}
          </h1>
          <p className="text-sm text-[#64748b]">Sign in to continue</p>
        </div>

        <form action={action} className="flex flex-col gap-7">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[#0f172a]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#f28b0d] focus:outline-none focus:ring-1 focus:ring-[#f28b0d]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[#0f172a]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#f28b0d] focus:outline-none focus:ring-1 focus:ring-[#f28b0d]"
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-[10px] bg-[#f28b0d] py-3.5 text-base font-bold text-white shadow-[0_2px_6px_rgba(242,139,13,0.25)] transition-colors hover:bg-[#e07d0b] disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
