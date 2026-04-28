"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

import {
  searchActiveProducts,
  type ProductSearchSuggestion,
} from "@/features/products/actions";

type Props = {
  onPick: (product: ProductSearchSuggestion) => void;
};

const DEBOUNCE_MS = 250;

export function ProductSearchInput({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) return;

    debounceRef.current = setTimeout(async () => {
      const rows = await searchActiveProducts(query);
      setResults(rows);
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border px-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (next.trim().length < 1) {
              setResults([]);
              setOpen(false);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar producto…"
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
          data-testid="product-suggestions"
        >
          {results.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected="false"
              className="cursor-pointer rounded-sm px-2 py-1.5 hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(p);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="font-medium">{p.name}</span>
              <span className="block text-xs text-muted-foreground">
                ${parseFloat(p.basePrice).toFixed(2)} · {p.priceType}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
