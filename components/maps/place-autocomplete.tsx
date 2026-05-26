"use client";

import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";

import { isGoogleMapsReady, loadGoogleMaps } from "./load-google-maps";

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

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Shared Google Places Autocomplete input. Used by both the cart (customer
 * destination) and admin (operations origin). It is context-neutral: it only
 * emits text + the picked place; callers decide what "stale" means by comparing
 * the current text to the last selected `formattedAddress`.
 *
 * Degrades to a plain text input when the API key is missing or the script
 * fails to load, which keeps it fully renderable in tests.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  // Keep the latest callbacks without re-initializing the widget every render.
  const onSelectRef = useRef(onPlaceSelected);
  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onSelectRef.current = onPlaceSelected;
    onValueChangeRef.current = onValueChange;
  });

  useEffect(() => {
    if (!API_KEY) return;

    let listener: google.maps.MapsEventListener | null = null;
    let cancelled = false;

    function init() {
      if (cancelled || !inputRef.current || autocompleteRef.current) return;
      if (!isGoogleMapsReady() || !window.google) return;

      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          fields: ["formatted_address", "geometry", "name"],
          types: ["address"],
          ...(country ? { componentRestrictions: { country } } : {}),
        },
      );
      autocompleteRef.current = autocomplete;

      listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const location = place.geometry?.location;
        // Frontend pre-validation: no geometry => unusable suggestion, ignore.
        if (!location) return;
        const formatted = place.formatted_address ?? place.name ?? "";
        onValueChangeRef.current(formatted);
        onSelectRef.current({
          formattedAddress: formatted,
          lat: location.lat(),
          lng: location.lng(),
        });
      });
    }

    loadGoogleMaps(API_KEY)
      .then(init)
      .catch(() => {
        // Leaves a usable plain input; activation gating surfaces misconfig.
      });

    return () => {
      cancelled = true;
      listener?.remove();
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
  }, [country]);

  return (
    <Input
      ref={inputRef}
      type="text"
      value={value}
      id={id}
      name={name}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      autoComplete="off"
      className={className}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}
