import { asc } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { categories } from "@/lib/db/schema";
import { Separator } from "@/components/ui/separator";
import * as categoryRepo from "@/lib/repositories/category";

import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const categoryList = await categoryRepo.findAll({
    columns: { id: true, name: true },
    orderBy: asc(categories.sortOrder),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-4" />
          Products
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          New product
        </h1>
        <p className="text-sm text-muted-foreground">
          Add a new product to your catalog.
        </p>
      </div>

      <Separator className="my-6" />

      <ProductForm action={createProduct} categories={categoryList} />
    </div>
  );
}
