// ADR-015: category copy is stored in Spanish (name/description) with optional
// English translations (*_en). These helpers resolve the value for a locale,
// falling back to Spanish field by field. Pure — safe on client and server.

export type CategoryLocale = "en" | "es";

type Nullable<T> = T | null | undefined;

export type LocalizableCategoryName = {
  name: string;
  nameEn?: Nullable<string>;
};

export type LocalizableCategory = LocalizableCategoryName & {
  description?: Nullable<string>;
  descriptionEn?: Nullable<string>;
};

function pick(
  locale: CategoryLocale,
  spanish: Nullable<string>,
  english: Nullable<string>,
): string | null {
  if (locale === "en" && english && english.trim().length > 0) return english;
  return spanish ?? null;
}

export function localizedCategoryName(
  category: LocalizableCategoryName,
  locale: CategoryLocale,
): string {
  return pick(locale, category.name, category.nameEn) ?? category.name;
}

export function localizeCategory(
  category: LocalizableCategory,
  locale: CategoryLocale,
): { name: string; description: string | null } {
  return {
    name: localizedCategoryName(category, locale),
    description: pick(locale, category.description, category.descriptionEn),
  };
}
