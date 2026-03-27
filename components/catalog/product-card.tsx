import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export type ProductCardProduct = {
  id: string;
  name: string;
  slug: string;
  basePrice: number; // Already converted from Decimal via .toNumber() by the parent
  priceType: "FIXED" | "PER_UNIT";
  photos: string[];
  category: { name: string; slug: string };
  hasVariants?: boolean;
  minVariantPrice?: number;
};

export type ProductCardLabels = {
  viewDetails: string; // m.catalog.viewDetails
  perUnit: string; // m.catalog.product.pricePerUnit
  price: string; // m.catalog.product.price
  fromPrice?: string; // m.catalog.product.fromPrice
};

export type ProductCardProps = {
  product: ProductCardProduct;
  locale: string;
  labels: ProductCardLabels;
};

export function ProductCard({ product, locale, labels }: ProductCardProps) {
  const photo = product.photos[0] ?? null;

  const lowestPrice = product.hasVariants && product.minVariantPrice !== undefined
    ? Math.min(product.basePrice, product.minVariantPrice)
    : product.basePrice;

  const prefix = product.hasVariants ? `${labels.fromPrice ?? "From"} ` : "";
  const priceDisplay =
    product.priceType === "PER_UNIT"
      ? `${prefix}$${lowestPrice.toFixed(2)} / ${labels.perUnit}`
      : `${prefix}$${lowestPrice.toFixed(2)}`;

  return (
    <div className="group relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
        {photo ? (
          <Image
            src={photo}
            alt={product.name}
            width={400}
            height={300}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <ImageOff className="size-12" />
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
          <Badge variant="outline">{product.category.name}</Badge>
        </div>

        <p className="text-sm font-semibold text-primary">{priceDisplay}</p>

        <Link
          href={`/${locale}/catalog/${product.slug}`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600"
        >
          {labels.viewDetails}
        </Link>
      </div>
    </div>
  );
}
