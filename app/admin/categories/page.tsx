import Link from "next/link";

import * as categoryRepo from "@/lib/repositories/category";

import { CategoryTable } from "./category-table";

export default async function AdminCategoriesPage() {
  const categoriesWithProducts = await categoryRepo.findAllWithProductCount();

  const categories = categoriesWithProducts.map((c) => ({
    ...c,
    _count: { products: c.products.length },
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Add category
        </Link>
      </div>

      <CategoryTable categories={categories} />
    </div>
  );
}
