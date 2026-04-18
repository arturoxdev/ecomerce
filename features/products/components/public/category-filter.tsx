"use client";

import { usePathname, useRouter } from "next/navigation";

export type FilterCategory = {
  id: string;
  name: string;
  slug: string;
};

export type CategoryFilterProps = {
  categories: FilterCategory[];
  currentSlug: string | null; // null = "All" is active
  allLabel: string; // m.catalog.filterAll
};

export function CategoryFilter({
  categories,
  currentSlug,
  allLabel,
}: CategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname(); // e.g. "/en/catalog"

  function handleSelect(slug: string | null) {
    if (slug && slug !== "all") {
      router.push(`${pathname}?category=${slug}`);
    } else {
      router.push(pathname);
    }
  }

  const baseClass =
    "whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-colors";
  const activeClass = "bg-primary text-white";
  const inactiveClass =
    "bg-slate-100 text-slate-600 hover:bg-slate-200";

  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
      <button
        className={`${baseClass} ${currentSlug === null ? activeClass : inactiveClass}`}
        onClick={() => handleSelect(null)}
        type="button"
      >
        {allLabel}
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          className={`${baseClass} ${currentSlug === category.slug ? activeClass : inactiveClass}`}
          onClick={() => handleSelect(category.slug)}
          type="button"
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
