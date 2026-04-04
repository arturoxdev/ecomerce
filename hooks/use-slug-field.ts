"use client";

import { useState } from "react";

import { toSlug } from "@/lib/utils";

export function useSlugField(defaultName?: string, defaultSlug?: string) {
  const [name, setName] = useState(defaultName ?? "");
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!defaultSlug);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true);
    setSlug(e.target.value);
  }

  return { name, slug, handleNameChange, handleSlugChange };
}
