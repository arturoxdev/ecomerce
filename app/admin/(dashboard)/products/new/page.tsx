import { asc } from "drizzle-orm";

import { categories } from "@/lib/db/schema";
import { SiteHeader } from "@/components/admin/site-header";
import { findAll as findAllCategories } from "@/lib/data/categories";

import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const categoryList = await findAllCategories({
    columns: { id: true, name: true },
    orderBy: asc(categories.sortOrder),
  });

  return (
    <>
      <SiteHeader title="New product" />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <ProductForm action={createProduct} categories={categoryList} />
        </div>
      </div>
    </>
  );
}
