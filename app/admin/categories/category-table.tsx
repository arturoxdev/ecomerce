"use client";

import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { deleteCategory, updateCategoryOrder } from "./actions";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count: { products: number };
};

type Props = {
  categories: Category[];
};

export function CategoryTable({ categories }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReorder(index: number, direction: "up" | "down") {
    const newCategories = [...categories];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newCategories.length) return;

    const items = newCategories.map((c, i) => {
      if (i === index) return { id: c.id, sortOrder: newCategories[swapIndex].sortOrder };
      if (i === swapIndex) return { id: c.id, sortOrder: newCategories[index].sortOrder };
      return { id: c.id, sortOrder: c.sortOrder };
    });

    startTransition(async () => {
      const result = await updateCategoryOrder(items);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteCategory(deleteId);
      setDeleteId(null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Category deleted");
        router.refresh();
      }
    });
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white py-16 text-center">
        <p className="text-gray-500">No categories yet.</p>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Create category
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Products</TableHead>
              <TableHead className="w-16">Order</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category, index) => (
              <TableRow key={category.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-sm text-gray-500">{category.slug}</TableCell>
                <TableCell className="max-w-xs truncate text-sm text-gray-500">
                  {category.description ?? "—"}
                </TableCell>
                <TableCell>
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {category._count.products}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleReorder(index, "up")}
                      disabled={index === 0 || isPending}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(index, "down")}
                      disabled={index === categories.length - 1 || isPending}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/categories/${category.id}/edit`}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteId(category.id)}
                      className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Categories with associated products
              cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
