import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateCategory, CategoryForm } from "@/features/admin-categories";
import { findCategoryById as findById } from "@/features/catalog";
import { SiteHeader } from "@/components/admin/site-header";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;

  const category = await findById(id);
  if (!category) notFound();

  const boundAction = updateCategory.bind(null, id);

  return (
    <>
      <SiteHeader title="Edit category" />
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
              <CategoryForm
                action={boundAction}
                defaultValues={{
                  name: category.name,
                  slug: category.slug,
                  description: category.description ?? "",
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
