import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

export function PagesEditorShell({
  title,
  locale,
  children,
}: {
  title: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <Link
        href="/admin/pages"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        Back to pages
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage the published content for the selected locale.
          </p>
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-[#e2e8f0] bg-white">
          {(["en", "es"] as const).map((value) => (
            <Link
              key={value}
              href={`?locale=${value}`}
              className={`px-5 py-2 text-sm font-semibold transition ${
                locale === value
                  ? "bg-primary text-white"
                  : "bg-white text-slate-600 hover:bg-[#fff7ed]"
              }`}
            >
              {value.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}

export function EditorCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#f1f5f9] bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
