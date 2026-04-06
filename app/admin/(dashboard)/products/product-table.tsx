"use client";

import { CalendarX2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useDeleteDialog } from "@/hooks/use-delete-dialog";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  category?: string;
  search?: string;
  canWrite?: boolean;
};

function paginationHref(page: number, filters?: { status?: string; category?: string; search?: string }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.category && filters.category !== "all") params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  return `/admin/products?${params.toString()}`;
}

export function ProductTable({ products, page, totalPages, status, category, search, canWrite = true }: Props) {
  const { targetId: deleteId, isPending, startTransition, openDialog: setDeleteId, closeDialog, confirmDelete } = useDeleteDialog();

  function handleDelete() {
    confirmDelete(deleteProduct, "Product deleted");
  }

  function handleToggle(productId: string) {
    startTransition(async () => {
      const result = await toggleProductActive(productId);
      if ("type" in result) {
        toast.error(result.detail ?? result.title);
      }
    });
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">No products yet.</p>
          <Button render={<Link href="/admin/products/new" />}>
            Create product
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
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
                  className={!product.isActive ? "opacity-60" : ""}
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category.name}</TableCell>
                  <TableCell>
                    ${product.basePrice.toString()}{" "}
                    <span className="text-xs text-muted-foreground">
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
                        <Badge
                          variant="outline"
                          className={product.isActive ? "border-green-200 bg-green-50 text-green-700" : ""}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    ) : (
                      <Badge
                        variant="outline"
                        className={product.isActive ? "border-green-200 bg-green-50 text-green-700" : ""}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="size-7" title="Manage availability" render={<Link href={`/admin/products/${product.id}/availability`} />}>
                          <CalendarX2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7" render={<Link href={`/admin/products/${product.id}/edit`} />}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={page > 1 ? paginationHref(page - 1, { status, category, search }) : undefined}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href={paginationHref(p, { status, category, search })}
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
                      ? paginationHref(page + 1, { status, category, search })
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && closeDialog()}>
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
