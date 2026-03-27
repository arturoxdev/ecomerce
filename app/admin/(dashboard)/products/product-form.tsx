"use client";

import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toSlug } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ProductFormState } from "./actions";

type Category = { id: string; name: string };

type Props = {
  action: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: Category[];
  defaultValues?: {
    name?: string;
    slug?: string;
    description?: string;
    about?: string;
    categoryId?: string;
    basePrice?: string;
    priceType?: string;
    stock?: string;
    photos?: string;
    isActive?: boolean;
  };
};

export function ProductForm({ action, categories, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  const [name, setName] = useState(defaultValues?.name ?? '');
  const [slug, setSlug] = useState(defaultValues?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!defaultValues?.slug);

  const [description, setDescription] = useState(defaultValues?.description ?? '');

  const [photos, setPhotos] = useState<string[]>(
    defaultValues?.photos?.split('\n').filter(Boolean) ?? []
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setName(value);
    if (!slugTouched) {
      setSlug(toSlug(value));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true);
    setSlug(e.target.value);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const { url } = await res.json();
        setPhotos((prev) => [...prev, url]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={state.fieldErrors?.name?.[0]}>
          <Input
            name="name"
            value={name}
            onChange={handleNameChange}
            required
          />
        </Field>

        <Field label="Slug" error={state.fieldErrors?.slug?.[0]}>
          <Input
            name="slug"
            value={slug}
            onChange={handleSlugChange}
            required
          />
        </Field>
      </div>

      <Field label="Description" error={state.fieldErrors?.description?.[0]}>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={150}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <p className={`text-xs ${description.length >= 140 ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {description.length}/150
        </p>
      </Field>

      <Field label="About this product" error={state.fieldErrors?.about?.[0]}>
        <textarea
          name="about"
          defaultValue={defaultValues?.about}
          rows={6}
          placeholder="Supports markdown: ## headings, **bold**, - lists"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" error={state.fieldErrors?.categoryId?.[0]}>
          <Select
            name="categoryId"
            defaultValue={defaultValues?.categoryId}
            items={categories.map((c) => ({ value: c.id, label: c.name }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} label={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Price type" error={state.fieldErrors?.priceType?.[0]}>
          <Select name="priceType" defaultValue={defaultValues?.priceType ?? "FIXED"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED">Fixed</SelectItem>
              <SelectItem value="PER_UNIT">Per unit</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Base price" error={state.fieldErrors?.basePrice?.[0]}>
          <Input
            name="basePrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.basePrice}
            required
          />
        </Field>

        <Field label="Stock" error={state.fieldErrors?.stock?.[0]}>
          <Input
            name="stock"
            type="number"
            min="0"
            defaultValue={defaultValues?.stock ?? "1"}
            required
          />
        </Field>
      </div>

      <Field label="Photos" error={state.fieldErrors?.photos?.[0]}>
        <input type="hidden" name="photos" value={photos.join('\n')} />

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {photos.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-md object-cover border border-input"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs leading-none"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload image'}
          </Button>
        </div>
      </Field>

      <div className="flex items-center gap-2">
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          value="true"
          defaultChecked={defaultValues?.isActive ?? true}
          className="size-4 rounded border-gray-300"
        />
        <Label htmlFor="isActive">Active (visible on storefront)</Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
