"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Field } from "@/components/admin/field";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSlugField } from "@/hooks/use-slug-field";
import { ExternalLink, Film } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  isVideoUrl,
  isVideoMime,
  getAcceptString,
  getMaxSizeForMime,
  MAX_MEDIA_COUNT,
} from "@/lib/services/media";

import { isFormError, getFieldErrors, type FormState as ProductFormState } from "@/lib/types/form-state";
type VariantFormState = ProductFormState;
import { appendProductPhoto, removeProductPhoto } from "../../actions";
import { VariantManager } from "./variant-manager";

type Category = { id: string; name: string };

type Variant = {
  id: string;
  name: string;
  price: string;
  stock: number;
};

type Props = {
  action: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: Category[];
  /** When set, media uploads/deletes are persisted to DB immediately. */
  productId?: string;
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
  variants?: Variant[];
  createVariantAction?: (
    prev: VariantFormState,
    formData: FormData,
  ) => Promise<VariantFormState>;
  updateVariantAction?: (
    variantId: string,
    prev: VariantFormState,
    formData: FormData,
  ) => Promise<VariantFormState>;
};

const BASIC_FIELDS = ["name", "slug", "description", "categoryId", "basePrice", "priceType", "stock", "photos"];
const ABOUT_FIELDS = ["about"];

export function ProductForm({
  action,
  categories,
  productId,
  defaultValues,
  variants,
  createVariantAction,
  updateVariantAction,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {} as ProductFormState);
  const fieldErrors = getFieldErrors(state);
  const { name, slug, handleNameChange, handleSlugChange } = useSlugField(
    defaultValues?.name,
    defaultValues?.slug,
  );

  useEffect(() => {
    if ("success" in state && state.success) {
      toast.success("Product saved");
    }
  }, [state]);

  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [about, setAbout] = useState(defaultValues?.about ?? "");

  const [photos, setPhotos] = useState<string[]>(
    defaultValues?.photos?.split("\n").filter(Boolean) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_MEDIA_COUNT - photos.length;
    if (remaining <= 0) return;
    const batch = files.slice(0, remaining);

    setUploading(true);
    try {
      for (const file of batch) {
        const maxSize = getMaxSizeForMime(file.type);
        if (file.size > maxSize) {
          const limitMB = maxSize / (1024 * 1024);
          const label = isVideoMime(file.type) ? "Videos" : "Images";
          toast.error(`${label} must be under ${limitMB}MB`, {
            description: file.name,
          });
          continue;
        }

        // Get presigned URL
        const presignRes = await fetch("/api/admin/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json();
          toast.error(err.detail ?? err.title ?? "Upload failed", {
            description: file.name,
          });
          continue;
        }

        const { presignedUrl, publicUrl } = await presignRes.json();

        // Upload directly to R2
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) {
          toast.error("Upload to storage failed", {
            description: "Please try again.",
          });
          continue;
        }

        // Persist to DB immediately if editing an existing product
        if (productId) {
          const result = await appendProductPhoto(productId, publicUrl);
          if ("type" in result) {
            toast.error(result.detail ?? result.title);
            continue;
          }
        }

        toast.success("File uploaded", { description: file.name });
        setPhotos((prev) => [...prev, publicUrl]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(url: string) {
    if (productId) {
      const result = await removeProductPhoto(productId, url);
      if ("type" in result) {
        toast.error(result.detail ?? result.title);
        return;
      }
      toast.success("File removed");
    }
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  const hasBasicErrors = fieldErrors && BASIC_FIELDS.some((f) => fieldErrors?.[f]);
  const hasAboutErrors = fieldErrors && ABOUT_FIELDS.some((f) => fieldErrors?.[f]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {isFormError(state) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.detail ?? state.title}
        </div>
      )}

      <Tabs defaultValue="basic">
        <TabsList variant="line">
          <TabsTrigger value="basic" className="relative">
            Basic Info
            {hasBasicErrors && (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive" />
            )}
          </TabsTrigger>
          <TabsTrigger value="about" className="relative">
            About
            {hasAboutErrors && (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive" />
            )}
          </TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" keepMounted className="flex flex-col gap-6 pt-6">
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">General</h3>
              <p className="text-sm text-muted-foreground">
                Name, slug, and short description.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={fieldErrors?.name?.[0]}>
                <Input
                  name="name"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Product name"
                  required
                />
              </Field>

              <Field label="Slug" error={fieldErrors?.slug?.[0]}>
                <Input
                  name="slug"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="product-slug"
                  required
                />
              </Field>
            </div>

            <Field label="Description" error={fieldErrors?.description?.[0]}>
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={150}
                rows={2}
                placeholder="Brief description of the product"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p
                className={cn(
                  "text-xs",
                  description.length >= 140 ? "text-amber-600" : "text-muted-foreground",
                )}
              >
                {description.length}/150
              </p>
            </Field>
          </section>

          <Separator />

          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">Pricing & inventory</h3>
              <p className="text-sm text-muted-foreground">
                Set the category, pricing model, and stock levels.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" error={fieldErrors?.categoryId?.[0]}>
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

              <Field label="Price type" error={fieldErrors?.priceType?.[0]}>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Base price" error={fieldErrors?.basePrice?.[0]}>
                <Input
                  name="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={defaultValues?.basePrice}
                  placeholder="0.00"
                  required
                />
              </Field>

              <Field label="Stock" error={fieldErrors?.stock?.[0]}>
                <Input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={defaultValues?.stock ?? "1"}
                  required
                />
              </Field>
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">Media</h3>
              <p className="text-sm text-muted-foreground">
                Upload images and videos. Max {MAX_MEDIA_COUNT} files (images up to 5 MB, videos up to 20 MB).
              </p>
            </div>

            <Field label="Photos & Videos" error={fieldErrors?.photos?.[0]}>
              <input type="hidden" name="photos" value={photos.join("\n")} />

              {photos.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {photos.map((url) => (
                    <div key={url} className="group relative">
                      {isVideoUrl(url) ? (
                        <div className="relative size-20 rounded-lg border border-input overflow-hidden bg-slate-900">
                          <video
                            src={url}
                            preload="metadata"
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Film className="size-5 text-white/80" />
                          </div>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={url}
                          alt=""
                          className="size-20 rounded-lg object-cover border border-input"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(url)}
                        className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs leading-none opacity-0 transition-opacity group-hover:opacity-100"
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
                  accept={getAcceptString()}
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || photos.length >= MAX_MEDIA_COUNT}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "Uploading\u2026" : "Upload media"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {photos.length}/{MAX_MEDIA_COUNT}
                </span>
              </div>
            </Field>
          </section>

          <Separator />

          <div className="flex items-center gap-3">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              value="true"
              defaultChecked={defaultValues?.isActive ?? true}
              className="size-4 rounded border-input"
            />
            <div className="flex flex-col">
              <Label htmlFor="isActive" className="text-sm font-medium">
                Active
              </Label>
              <span className="text-xs text-muted-foreground">
                Visible on the storefront when enabled.
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="about" keepMounted className="flex flex-col gap-6 pt-6">
          <div>
            <h3 className="text-sm font-medium text-foreground">About this product</h3>
            <p className="text-sm text-muted-foreground">
              Rich text description displayed on the product page.
            </p>
          </div>
          <Field label="Content" error={fieldErrors?.about?.[0]}>
            <MarkdownEditor
              value={about}
              onChange={setAbout}
              name="about"
            />
          </Field>
        </TabsContent>

        <TabsContent value="variants" className="flex flex-col gap-6 pt-6">
          {variants && createVariantAction && updateVariantAction ? (
            <VariantManager
              variants={variants}
              createAction={createVariantAction}
              updateAction={updateVariantAction}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/25 py-12">
              <p className="text-sm font-medium text-muted-foreground">
                No variants yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Save the product first to start adding variants.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving\u2026" : "Save product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
        {slug && (
          <a
            href={`/catalog/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <ExternalLink data-icon="inline-start" />
            View product
          </a>
        )}
      </div>
    </form>
  );
}
