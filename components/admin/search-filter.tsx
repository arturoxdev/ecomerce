"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";

import { Input } from "@/components/ui/input";

type Props = {
  /** Query param key to write to. */
  paramKey?: string;
  placeholder?: string;
  width?: number;
  /** Debounce in ms. */
  debounce?: number;
};

export function SearchFilter({
  paramKey = "search",
  placeholder = "Buscar…",
  width = 300,
  debounce = 300,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const current = searchParams.get(paramKey) ?? "";

  const update = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(paramKey, value);
      else params.delete(paramKey);
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams, paramKey],
  );

  return (
    <div className="relative" style={{ width }}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
      <Input
        defaultValue={current}
        placeholder={placeholder}
        onChange={(e) => {
          const value = e.target.value;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => update(value), debounce);
        }}
        className="pl-9"
      />
    </div>
  );
}
