import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createVariant, updateProduct, updateVariant, ProductForm } from "@/features/products";
import {
  findAllVariantsByProductId,
  findProductById,
} from "@/features/products/services/products.service";
import { findAll as findAllCategories } from "@/features/categories/services/categories.service";
import { categories } from "@/lib/db/schema";
import { SiteHeader } from "@/components/admin/site-header";
import { StatusBadge } from "@/components/admin/status-badge";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, categoryList, variants] = await Promise.all([
    findProductById(id),
    findAllCategories({
      columns: { id: true, name: true },
      orderBy: asc(categories.sortOrder),
    }),
    findAllVariantsByProductId(id),
  ]);

  if (!product) notFound();

  const boundAction = updateProduct.bind(null, id);
  const boundCreateVariant = createVariant.bind(null, id);

  return (
    <>
      <SiteHeader
        title={
          <nav className="flex items-center gap-2 text-[12.5px]">
            <Link
              href="/admin/products"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Productos
            </Link>
            <span className="text-subtle">/</span>
            <span className="font-semibold text-foreground">Editar producto</span>
          </nav>
        }
        actions={
          <StatusBadge state={product.isActive ? "active" : "inactive"} />
        }
      />
      <div className="w-full px-7 pt-6 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {product.name}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Edita los detalles, la descripción y las variantes del producto.
        </p>
      </div>
      <div className="w-full px-7 pb-7">

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
    </>
  );
}
