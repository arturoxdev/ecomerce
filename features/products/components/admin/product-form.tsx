"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Field } from "@/components/admin/field";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSlugField } from "@/hooks/use-slug-field";
import {
  CalendarX2,
  Check,
  ExternalLink,
  Film,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteProduct } from "../../actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SlugField } from "./slug-field";
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

  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!productId) return;
    startDeleteTransition(async () => {
      const result = await deleteProduct(productId);
      if (result && "type" in result) {
        toast.error(result.detail ?? result.title);
        return;
      }
      toast.success("Product deleted");
      router.push("/admin/products");
    });
  }

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
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.detail ?? state.title}
        </div>
      )}

      <Tabs defaultValue="basic" className="flex-col">
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
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                Name, slug, and short description.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
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

                <SlugField
                  value={slug}
                  onChange={handleSlugChange}
                  error={fieldErrors?.slug?.[0]}
                  required
                />
              </div>

              <Field label="Description" error={fieldErrors?.description?.[0]}>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={150}
                  rows={3}
                  placeholder="Brief description of the product"
                  className="min-h-[70px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <p
                  className={cn(
                    "text-right text-[11px]",
                    description.length >= 140 ? "text-warning" : "text-subtle",
                  )}
                >
                  {description.length}/150
                </p>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & inventory</CardTitle>
              <CardDescription>
                Set the category, pricing model, and stock levels.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
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
                    className="font-mono"
                  />
                </Field>

                <Field label="Stock" error={fieldErrors?.stock?.[0]}>
                  <Input
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue={defaultValues?.stock ?? "1"}
                    required
                    className="font-mono"
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
              <CardDescription>
                Upload images and videos. Max {MAX_MEDIA_COUNT} files (images up
                to 5 MB, videos up to 20 MB).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Photos & Videos" error={fieldErrors?.photos?.[0]}>
                <input type="hidden" name="photos" value={photos.join("\n")} />

                <div className="grid grid-cols-6 gap-2.5">
                  {photos.map((url) => (
                    <div
                      key={url}
                      className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted/40"
                    >
                      {isVideoUrl(url) ? (
                        <div className="relative h-full w-full bg-foreground/90">
                          <video
                            src={url}
                            preload="metadata"
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Film className="size-5 text-background/80" />
                          </div>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(url)}
                        className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs leading-none opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        \u00d7
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_MEDIA_COUNT && (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong bg-background text-[11px] text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
                    >
                      <Upload className="size-4" />
                      {uploading ? "Uploading\u2026" : "Upload"}
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptString()}
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                <span className="text-[11.5px] text-subtle">
                  {photos.length}/{MAX_MEDIA_COUNT} files uploaded
                </span>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
              <CardDescription>
                Control whether the product is visible in the storefront.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="isActive"
                className="flex cursor-pointer items-start gap-2.5"
              >
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  value="true"
                  defaultChecked={defaultValues?.isActive ?? true}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="mt-px grid size-[18px] shrink-0 place-items-center rounded-[4px] border border-border bg-background transition-colors peer-checked:border-secondary peer-checked:bg-secondary peer-checked:text-secondary-foreground peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50"
                >
                  <Check className="size-3 opacity-0" strokeWidth={3} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold text-foreground">
                    Active
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    Visible on the storefront when in stock.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>
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

      <div className="sticky bottom-0 z-10 -mx-7 flex items-center gap-2.5 border-t border-border bg-background px-7 py-4">
        <Button
          type="submit"
          variant="cta"
          disabled={pending}
          className="h-9 gap-1.5 rounded-md px-4 text-[13.5px] font-semibold"
        >
          {pending ? "Saving\u2026" : "Save product"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => history.back()}
          className="h-9 rounded-md px-3.5 text-[13.5px] font-semibold"
        >
          Cancel
        </Button>

        <div className="ml-auto flex items-center gap-1">
          {productId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[12.5px] text-muted-foreground"
              render={
                <Link href={`/admin/products/${productId}/availability`} />
              }
            >
              <CalendarX2 data-icon="inline-start" />
              Availability
            </Button>
          )}
          {productId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[12.5px] text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleting}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          )}
          {slug && (
            <a
              href={`/catalog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-[12.5px] text-muted-foreground",
              )}
            >
              <ExternalLink data-icon="inline-start" />
              View product
            </a>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Products with associated orders
              cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30"
            >
              {deleting ? "Deleting\u2026" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
