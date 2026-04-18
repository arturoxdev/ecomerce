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
      <SiteHeader title="New category" />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-2xl px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Category details</CardTitle>
              <CardDescription>
                Name, slug, and description for this category.
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
