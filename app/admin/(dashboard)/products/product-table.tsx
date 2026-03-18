"use client";

import { CalendarX2, Pencil, Trash2 } from "lucide-react";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { deleteProduct, toggleProductActive } from "./actions";

type Product = {
  id: string;
  name: string;
  basePrice: string;
  priceType: string;
  stock: number;
  isActive: boolean;
  category: { name: string };
};

type Props = {
  products: Product[];
  page: number;
  totalPages: number;
  status?: string;
  canWrite?: boolean;
};

function paginationHref(page: number, status?: string) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (status && status !== "all") params.set("status", status);
  return `/admin/products?${params.toString()}`;
}

export function ProductTable({ products, page, totalPages, status, canWrite = true }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteProduct(deleteId);
      setDeleteId(null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Product deleted");
        router.refresh();
      }
    });
  }

  function handleToggle(productId: string) {
    startTransition(async () => {
      const result = await toggleProductActive(productId);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white py-16 text-center">
        <p className="text-gray-500">No products yet.</p>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Create product
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
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              {canWrite && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                className={`hover:bg-gray-50 ${!product.isActive ? "opacity-60" : ""}`}
              >
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category.name}</TableCell>
                <TableCell>
                  ${product.basePrice.toString()}{" "}
                  <span className="text-xs text-gray-500">
                    {product.priceType === "PER_UNIT" ? "/unit" : ""}
                  </span>
                </TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  {canWrite ? (
                    <button
                      onClick={() => handleToggle(product.id)}
                      disabled={isPending}
                      className="cursor-pointer"
                    >
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </button>
                  ) : (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  )}
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/products/${product.id}/availability`}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="Manage availability"
                      >
                        <CalendarX2 className="size-4" />
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteId(product.id)}
                        className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={page > 1 ? paginationHref(page - 1, status) : undefined}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href={paginationHref(p, status)}
                    isActive={p === page}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={
                    page < totalPages
                      ? paginationHref(page + 1, status)
                      : undefined
                  }
                  aria-disabled={page >= totalPages}
                  className={
                    page >= totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Products with associated orders
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
