"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
] as const;

export function ProductStatusFilter() {
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "all";

  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={
            tab.value === "all"
              ? "/admin/products"
              : `/admin/products?status=${tab.value}`
          }
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            current === tab.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
