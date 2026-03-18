import { notFound } from "next/navigation";

import * as categoryRepo from "@/lib/repositories/category";

import { updateCategory } from "../../actions";
import { CategoryForm } from "../../category-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;

  const category = await categoryRepo.findById(id);
  if (!category) notFound();

  const boundAction = updateCategory.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit category</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <CategoryForm
          action={boundAction}
          defaultValues={{
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
          }}
        />
      </div>
    </div>
  );
}
