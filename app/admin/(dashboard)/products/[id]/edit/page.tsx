import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { categories } from "@/lib/db/schema";
import { Separator } from "@/components/ui/separator";
import * as categoryRepo from "@/lib/repositories/category";
import * as productRepo from "@/lib/repositories/product";
import * as variantRepo from "@/lib/repositories/variant";

import { createVariant, updateProduct, updateVariant } from "../../actions";
import { ProductForm } from "../../product-form";

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
    <div className="mx-auto">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-4" />
          Products
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {product.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Edit product details, description, and variants.
        </p>
      </div>

      <Separator className="my-6" />

      <ProductForm
        action={boundAction}
        categories={categoryList}
        productId={id}
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
        variants={variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          stock: v.stock,
        }))}
        createVariantAction={boundCreateVariant}
        updateVariantAction={updateVariant}
      />
    </div>
  );
}
