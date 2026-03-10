import { createCategory } from "../actions";
import { CategoryForm } from "../category-form";

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New category</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <CategoryForm action={createCategory} />
      </div>
    </div>
  );
}
