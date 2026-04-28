"use client";

import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Suggestion = { city: string; zipcode: string; fee: number };

export type SelectedZone = { city: string; zipCode: string };

type Labels = {
  placeholder: string;
  searchPlaceholder: string;
  empty: string;
  loading: string;
};

type Props = {
  value: SelectedZone | null;
  onChange: (zone: SelectedZone | null, fee: number | null) => void;
  labels?: Partial<Labels>;
  className?: string;
};

const DEFAULT_LABELS: Labels = {
  placeholder: "Selecciona ciudad y zipcode",
  searchPlaceholder: "Buscar ciudad o zipcode…",
  empty: "Aún no hacemos entregas a ese destino",
  loading: "Buscando…",
};

function pairKey(city: string, zipcode: string): string {
  return `${city.toLowerCase()}|${zipcode}`;
}

export function ZipcodeCombobox({
  value,
  onChange,
  labels: labelsProp,
  className,
}: Props) {
  const labels: Labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [fetchedQuery, setFetchedQuery] = useState<string | null>(null);
  const loading = fetchedQuery !== deferredQuery;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const url = `/api/zipcodes/search?q=${encodeURIComponent(deferredQuery)}&limit=20`;
    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { items: Suggestion[] }) => {
        if (cancelled) return;
        setResults(Array.isArray(data.items) ? data.items : []);
        setFetchedQuery(deferredQuery);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setFetchedQuery(deferredQuery);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [deferredQuery]);

  const selectedKey = value ? pairKey(value.city, value.zipCode) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <MapPin className="size-4 shrink-0" />
          {value ? (
            <>
              <span className="truncate">{value.city}</span>
              <span className="font-mono text-muted-foreground">
                {value.zipCode}
              </span>
            </>
          ) : (
            labels.placeholder
          )}
        </span>
        <ChevronsUpDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={labels.searchPlaceholder}
          />
          <CommandList>
            {loading && (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                {labels.loading}
              </div>
            )}
            {!loading && results.length === 0 && (
              <CommandEmpty>{labels.empty}</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((row) => {
                const rowKey = pairKey(row.city, row.zipcode);
                return (
                  <CommandItem
                    key={rowKey}
                    value={rowKey}
                    onSelect={() => {
                      onChange(
                        { city: row.city, zipCode: row.zipcode },
                        row.fee,
                      );
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        selectedKey === rowKey ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{row.city}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.zipcode}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      ${row.fee.toFixed(2)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
