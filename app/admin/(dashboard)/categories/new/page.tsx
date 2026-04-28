import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/admin/site-header";

import { createCategory, CategoryForm } from "@/features/categories";

export default function NewCategoryPage() {
  return (
    <>
      <SiteHeader title="Nueva categoría" />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-2xl px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la categoría</CardTitle>
              <CardDescription>
                Nombre, slug y descripción de esta categoría.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryForm action={createCategory} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
