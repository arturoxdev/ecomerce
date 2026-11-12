// ADR-013: product copy is stored in Spanish (name/description/about) with
// optional English translations (*_en). These helpers resolve the value for a
// locale, falling back to Spanish field by field. Pure — safe on client and
// server.

export type ProductLocale = "en" | "es";

type Nullable<T> = T | null | undefined;

export type LocalizableProductName = {
  name: string;
  nameEn?: Nullable<string>;
};

export type LocalizableProduct = LocalizableProductName & {
  description?: Nullable<string>;
  descriptionEn?: Nullable<string>;
  about?: Nullable<string>;
  aboutEn?: Nullable<string>;
};

function pick(
  locale: ProductLocale,
  spanish: Nullable<string>,
  english: Nullable<string>,
): string | null {
  if (locale === "en" && english && english.trim().length > 0) return english;
  return spanish ?? null;
}

export function localizedProductName(
  product: LocalizableProductName,
  locale: ProductLocale,
): string {
  return pick(locale, product.name, product.nameEn) ?? product.name;
}

export function localizeProduct(
  product: LocalizableProduct,
  locale: ProductLocale,
): { name: string; description: string | null; about: string | null } {
  return {
    name: localizedProductName(product, locale),
    description: pick(locale, product.description, product.descriptionEn),
    about: pick(locale, product.about, product.aboutEn),
  };
}
