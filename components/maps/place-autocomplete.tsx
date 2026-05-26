"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { loadGoogleMaps } from "./load-google-maps";

/** True only when the Places API (New) classes are actually on `window`. */
function isPlacesNewReady(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.google?.maps?.places?.AutocompleteSuggestion
      ?.fetchAutocompleteSuggestions === "function"
  );
}

export type SelectedPlace = {
  formattedAddress: string;
  lat: number;
  lng: number;
};

type Props = {
  /** Controlled text (the formatted address). */
  value: string;
  /** Fires on every keystroke and on selection. */
  onValueChange: (value: string) => void;
  /** Fires only when a suggestion with valid geometry is picked. */
  onPlaceSelected: (place: SelectedPlace) => void;
  placeholder?: string;
  disabled?: boolean;
  /** ISO country code(s) to restrict suggestions, e.g. "us" or ["us","mx"]. */
  country?: string | string[];
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
};

type Suggestion = {
  placeId: string;
  primary: string;
  secondary?: string;
  prediction: google.maps.places.PlacePrediction;
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 250;

/**
 * Shared Google Places Autocomplete input. Used by both the cart (customer
 * destination) and admin (operations origin). It is context-neutral: it only
 * emits text + the picked place; callers decide what "stale" means by comparing
 * the current text to the last selected `formattedAddress`.
 *
 * Backed by the Places API (New): we fetch predictions with
 * `AutocompleteSuggestion.fetchAutocompleteSuggestions`, render our own dropdown
 * over the shared `Input`, and resolve coordinates with `Place.fetchFields` on
 * selection. A single `AutocompleteSessionToken` groups the keystrokes + details
 * call into one billable session.
 *
 * Degrades to a plain text input when the API key is missing or the script fails
 * to load, which keeps it fully renderable in tests.
 */
export function PlaceAutocomplete({
  value,
  onValueChange,
  onPlaceSelected,
  placeholder,
  disabled,
  country,
  id,
  name,
  required,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id to discard out-of-order (stale) autocomplete responses.
  const requestSeqRef = useRef(0);

  // Keep the latest callbacks without re-creating handlers every render.
  const onSelectRef = useRef(onPlaceSelected);
  const onValueChangeRef = useRef(onValueChange);
  // CLDR region codes for `includedRegionCodes`, kept in a ref so the stable
  // fetcher always reads the current value.
  const regionCodesRef = useRef<string[] | undefined>(undefined);
  useEffect(() => {
    onSelectRef.current = onPlaceSelected;
    onValueChangeRef.current = onValueChange;
    regionCodesRef.current = country
      ? (Array.isArray(country) ? country : [country]).map((c) =>
          c.toLowerCase(),
        )
      : undefined;
  });

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Viewport-anchored coords for the portaled dropdown (see below).
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Kick off the SDK load once. On failure we keep a usable plain input;
  // activation gating surfaces misconfig.
  useEffect(() => {
    if (!API_KEY) return;
    loadGoogleMaps(API_KEY).catch(() => {});
  }, []);

  // Close the dropdown when clicking outside the input or the (portaled) list.
  useEffect(() => {
    function onDocPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, []);

  // The dropdown is rendered in a portal to escape ancestor `overflow-hidden`
  // / stacking contexts (e.g. shadcn <Card>), so we anchor it to the input with
  // fixed coordinates and keep them in sync while open.
  useEffect(() => {
    if (!open) return;
    function updateCoords() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    updateCoords();
    // Capture phase catches scrolling inside any ancestor, not just window.
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open, suggestions.length]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const runFetch = useCallback(async (input: string) => {
    if (!isPlacesNewReady()) return;
    const { AutocompleteSuggestion, AutocompleteSessionToken } =
      window.google!.maps.places;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const seq = ++requestSeqRef.current;
    try {
      const { suggestions: results } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionTokenRef.current,
          ...(regionCodesRef.current
            ? { includedRegionCodes: regionCodesRef.current }
            : {}),
        });
      // Drop responses superseded by a newer keystroke.
      if (seq !== requestSeqRef.current) return;

      const mapped: Suggestion[] = [];
      for (const suggestion of results) {
        const prediction = suggestion.placePrediction;
        // Skip query predictions; we only resolve real places.
        if (!prediction) continue;
        mapped.push({
          placeId: prediction.placeId,
          primary:
            prediction.mainText?.toString() ?? prediction.text.toString(),
          secondary: prediction.secondaryText?.toString(),
          prediction,
        });
      }
      setSuggestions(mapped);
      setActiveIndex(-1);
      setOpen(mapped.length > 0);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  function handleInputChange(next: string) {
    onValueChange(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = next.trim();
    if (!isPlacesNewReady() || trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runFetch(trimmed), DEBOUNCE_MS);
  }

  async function handleSelect(suggestion: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    try {
      const place = suggestion.prediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "location", "displayName"],
      });
      const location = place.location;
      // Frontend pre-validation: no geometry => unusable suggestion, ignore.
      if (!location) return;
      const formatted =
        place.formattedAddress ?? place.displayName ?? suggestion.primary;
      onValueChangeRef.current(formatted);
      onSelectRef.current({
        formattedAddress: formatted,
        lat: location.lat(),
        lng: location.lng(),
      });
    } catch {
      // Details fetch failed; leave the typed text untouched.
    } finally {
      // A picked place closes the billing session; start fresh next time.
      sessionTokenRef.current = null;
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        event.preventDefault();
        handleSelect(suggestions[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const listboxId = id ? `${id}-listbox` : undefined;
  const activeOptionId =
    id && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        value={value}
        id={id}
        name={name}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
        className={className}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        onChange={(event) => handleInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
      />
      {open &&
        suggestions.length > 0 &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 50,
            }}
            className="max-h-72 overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.placeId}
                id={id ? `${id}-option-${index}` : undefined}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  // Prevent the input blur from closing the list before the click.
                  event.preventDefault();
                  handleSelect(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm",
                  index === activeIndex && "bg-accent text-accent-foreground",
                )}
              >
                <span className="block">{suggestion.primary}</span>
                {suggestion.secondary && (
                  <span className="block text-xs text-muted-foreground">
                    {suggestion.secondary}
                  </span>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
