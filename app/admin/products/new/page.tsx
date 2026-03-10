import { db } from "@/lib/db";

import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New product</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ProductForm action={createProduct} categories={categories} />
      </div>
    </div>
  );
}
