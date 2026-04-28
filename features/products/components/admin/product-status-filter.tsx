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
      ? "Todas las categorías"
      : categories.find((c) => c.id === currentCategory)?.name ?? "Todas las categorías";

  const statusLabels: Record<string, string> = {
    all: "Todos",
    active: "Activos",
    inactive: "Inactivos",
  };

  const labelCn = "text-xs font-semibold text-foreground";

  return (
    <div className="flex flex-wrap items-end gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-search" className={labelCn}>
          Buscar
        </Label>
        <div className="relative w-[300px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            id="product-search"
            placeholder="Buscar por nombre…"
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
        <Label className={labelCn}>Categoría</Label>
        <Select
          value={currentCategory}
          onValueChange={(value) => updateParams("category", value ?? "all")}
        >
          <SelectTrigger className="w-[210px]">{categoryLabel}</SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className={labelCn}>Estado</Label>
        <Select
          value={currentStatus}
          onValueChange={(value) => updateParams("status", value ?? "all")}
        >
          <SelectTrigger className="w-[150px]">
            {statusLabels[currentStatus] ?? "Todos"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
