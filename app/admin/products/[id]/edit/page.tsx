import { notFound } from "next/navigation";

import { db } from "@/lib/db";

import { updateProduct } from "../../actions";
import { ProductForm } from "../../product-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  const boundAction = updateProduct.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit product</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ProductForm
          action={boundAction}
          categories={categories}
          defaultValues={{
            name: product.name,
            slug: product.slug,
            description: product.description ?? "",
            categoryId: product.categoryId,
            basePrice: product.basePrice.toString(),
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
