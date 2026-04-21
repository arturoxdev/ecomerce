import { ImageOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getStoreSettings } from "@/features/cart/services/cart-order.service";
import { ProductDetailActions, ProductGallery } from "@/features/products";
import {
  findBySlug as findBySlug,
  findBySlugMeta,
} from "@/features/products/services/products.service";
import { MarkdownContent } from "@/features/pages";
import { Badge } from "@/components/ui/badge";
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
  const product = await findBySlugMeta(slug);
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

  const [product, settings] = await Promise.all([
    findBySlug(slug),
    getStoreSettings(),
  ]);

  if (!product || !product.isActive) {
    notFound();
  }

  const basePrice = parseFloat(product.basePrice);
  const activeVariants = product.variants?.filter((v) => v.isActive) ?? [];
  const showSplitNotice = settings.paymentMode === "SPLIT_50_50";

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
              <ProductGallery
                photos={product.photos}
                productName={product.name}
              />
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

            <ProductDetailActions
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
              productPhoto={product.photos[0] ?? null}
              basePrice={basePrice}
              baseStock={product.stock ?? 0}
              priceType={product.priceType}
              variants={activeVariants.map((v) => ({
                id: v.id,
                name: v.name,
                price: parseFloat(v.price),
                stock: v.stock,
              }))}
              showSplitNotice={showSplitNotice}
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
                addToCart: m.cart.addToCart,
                addedToCart: m.cart.addedToCart,
                selectDatesFirst: m.cart.selectDatesFirst,
                quantity: m.cart.quantity,
                perUnit: m.cart.perUnit,
                splitBadge: m.payment.splitBadge,
                splitNotice: m.payment.splitNotice,
              }}
            />
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
