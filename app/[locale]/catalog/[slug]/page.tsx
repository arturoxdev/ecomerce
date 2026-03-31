import { ImageOff } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AvailabilityChecker } from "@/components/catalog/availability-checker";
import { VariantSelector } from "@/components/catalog/variant-selector";
import { MarkdownContent } from "@/components/public/markdown-content";
import { Badge } from "@/components/ui/badge";
import * as productRepo from "@/lib/repositories/product";
import { siteConfig } from "@/lib/config/site";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type ProductDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await productRepo.findBySlugMeta(slug);
  if (!product) return {};
  return {
    title: `${product.name} | ${siteConfig.name}`,
    description: product.description ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const m = getMessages(typedLocale);

  const product = await productRepo.findBySlug(slug);

  if (!product || !product.isActive) {
    notFound();
  }

  const basePrice = parseFloat(product.basePrice);
  const activeVariants = product.variants?.filter((v) => v.isActive) ?? [];
  const hasVariants = activeVariants.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href={`/${typedLocale}`} className="hover:text-primary">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/${typedLocale}/catalog`}
            className="hover:text-primary"
          >
            {m.catalog.title}
          </Link>
          <span>/</span>
          <span className="text-slate-900">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Photo gallery */}
          <div className="space-y-4">
            {product.photos.length > 0 ? (
              <div
                className="flex gap-3 overflow-x-auto pb-2"
                aria-label={m.catalog.product.gallery}
              >
                {product.photos.map((photo, index) => (
                  <div
                    key={index}
                    className="aspect-[4/3] w-full min-w-[280px] flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 first:min-w-full"
                  >
                    <Image
                      src={photo}
                      alt={`${product.name} — photo ${index + 1}`}
                      width={800}
                      height={600}
                      className="h-full w-full object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <ImageOff className="size-16" />
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Badge variant="outline">{product.category.name}</Badge>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {product.name}
              </h1>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-slate-600 leading-relaxed">
                {product.description}
              </p>
            )}

            {hasVariants ? (
              <VariantSelector
                productId={product.id}
                basePrice={basePrice}
                baseStock={product.stock ?? 0}
                pricingModel={product.priceType}
                variants={activeVariants.map((v) => ({
                  id: v.id,
                  name: v.name,
                  price: parseFloat(v.price),
                  stock: v.stock,
                }))}
                labels={{
                  price: m.catalog.product.price,
                  pricePerUnit: m.catalog.product.pricePerUnit,
                  stock: m.catalog.product.stock,
                  selectVariant:
                    m.catalog.product.selectVariant ?? "Select an option",
                  availability: {
                    checkDates: m.catalog.availability.title,
                    startDate: m.catalog.availability.startDate,
                    endDate: m.catalog.availability.endDate,
                    loading: m.catalog.availability.loading,
                    available: m.catalog.availability.available,
                    notAvailable: m.catalog.availability.notAvailable,
                    unitsAvailable: m.catalog.availability.unitsAvailable,
                    invalidRange: m.catalog.availability.invalidRange,
                    errorFetch: m.catalog.availability.errorFetch,
                  },
                }}
              />
            ) : (
              <>
                {/* Price */}
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {m.catalog.product.price}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    ${basePrice.toFixed(2)}
                    {product.priceType === "PER_UNIT" && (
                      <span className="ml-1 text-base font-normal text-slate-500">
                        / {m.catalog.product.pricePerUnit}
                      </span>
                    )}
                  </p>
                </div>

                {/* Stock (PER_UNIT only) */}
                {product.priceType === "PER_UNIT" && (
                  <p className="text-sm text-slate-500">
                    <span className="font-medium">
                      {m.catalog.product.stock}:
                    </span>{" "}
                    {product.stock ?? 0}
                  </p>
                )}

                {/* Availability checker (client island) */}
                <AvailabilityChecker
                  productId={product.id}
                  pricingModel={product.priceType}
                  stock={product.stock ?? 0}
                  labels={{
                    checkDates: m.catalog.availability.title,
                    startDate: m.catalog.availability.startDate,
                    endDate: m.catalog.availability.endDate,
                    loading: m.catalog.availability.loading,
                    available: m.catalog.availability.available,
                    notAvailable: m.catalog.availability.notAvailable,
                    unitsAvailable: m.catalog.availability.unitsAvailable,
                    invalidRange: m.catalog.availability.invalidRange,
                    errorFetch: m.catalog.availability.errorFetch,
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* About This Product */}
        {product.about && (
          <div className="mt-16 space-y-6">
            <div className="border-t border-slate-200" />
            <h2 className="text-2xl font-extrabold text-slate-900">
              About This Product
            </h2>
            <div className="rounded-2xl border border-slate-100 bg-white p-8">
              <MarkdownContent markdown={product.about} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
