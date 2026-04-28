"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type Category = {
  id: string;
  name: string;
};

type Props = {
  categories: Category[];
};

export function ProductFilters({ categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "all";
  const currentCategory = searchParams.get("category") ?? "all";
  const currentSearch = searchParams.get("search") ?? "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const categoryLabel =
    currentCategory === "all"
      ? "All categories"
      : categories.find((c) => c.id === currentCategory)?.name ?? "All categories";

  const statusLabels: Record<string, string> = {
    all: "All",
    active: "Active",
    inactive: "Inactive",
  };

  const labelCn = "text-xs font-semibold text-foreground";

  return (
    <div className="flex flex-wrap items-end gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-search" className={labelCn}>
          Search
        </Label>
        <div className="relative w-[300px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            id="product-search"
            placeholder="Search by name…"
            defaultValue={currentSearch}
            onChange={(e) => {
              const value = e.target.value;
              const timeout = setTimeout(() => updateParams("search", value), 300);
              return () => clearTimeout(timeout);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className={labelCn}>Category</Label>
        <Select
          value={currentCategory}
          onValueChange={(value) => updateParams("category", value ?? "all")}
        >
          <SelectTrigger className="w-[210px]">{categoryLabel}</SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className={labelCn}>Status</Label>
        <Select
          value={currentStatus}
          onValueChange={(value) => updateParams("status", value ?? "all")}
        >
          <SelectTrigger className="w-[150px]">
            {statusLabels[currentStatus] ?? "All"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
