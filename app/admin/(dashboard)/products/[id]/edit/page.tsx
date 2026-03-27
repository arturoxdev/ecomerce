import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

import { categories } from "@/lib/db/schema";
import * as categoryRepo from "@/lib/repositories/category";
import * as productRepo from "@/lib/repositories/product";
import * as variantRepo from "@/lib/repositories/variant";

import { createVariant, updateProduct, updateVariant } from "../../actions";
import { ProductForm } from "../../product-form";
import { VariantManager } from "../../variant-manager";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, categoryList, variants] = await Promise.all([
    productRepo.findById(id),
    categoryRepo.findAll({
      columns: { id: true, name: true },
      orderBy: asc(categories.sortOrder),
    }),
    variantRepo.findAllByProductId(id),
  ]);

  if (!product) notFound();

  const boundAction = updateProduct.bind(null, id);
  const boundCreateVariant = createVariant.bind(null, id);

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
            about: product.about ?? "",
            categoryId: product.categoryId,
            basePrice: product.basePrice,
            priceType: product.priceType,
            stock: product.stock.toString(),
            photos: product.photos.join("\n"),
            isActive: product.isActive,
          }}
        />
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <VariantManager
          variants={variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            stock: v.stock,
          }))}
          createAction={boundCreateVariant}
          updateAction={updateVariant}
        />
      </div>
    </div>
  );
}
