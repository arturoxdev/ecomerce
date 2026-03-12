import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

import { categories } from "@/lib/db/schema";
import * as categoryRepo from "@/lib/repositories/category";
import * as productRepo from "@/lib/repositories/product";

import { updateProduct } from "../../actions";
import { ProductForm } from "../../product-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, categoryList] = await Promise.all([
    productRepo.findById(id),
    categoryRepo.findAll({
      columns: { id: true, name: true },
      orderBy: asc(categories.sortOrder),
    }),
  ]);

  if (!product) notFound();

  const boundAction = updateProduct.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit product</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ProductForm
          action={boundAction}
          categories={categoryList}
          defaultValues={{
            name: product.name,
            slug: product.slug,
            description: product.description ?? "",
            categoryId: product.categoryId,
            basePrice: product.basePrice,
            priceType: product.priceType,
            stock: product.stock.toString(),
            photos: product.photos.join("\n"),
            isActive: product.isActive,
          }}
        />
      </div>
    </div>
  );
}
