"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";

import { toggleProductActive } from "../../actions";

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
  total?: number;
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

const headCellCn =
  "h-auto px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground";
const bodyCellCn = "px-[22px] py-[13px]";

export function ProductTable({
  products,
  page,
  totalPages,
  total,
  status,
  category,
  search,
  canWrite = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle(productId: string, e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleProductActive(productId);
      if ("type" in result) {
        toast.error(result.detail ?? result.title);
      }
    });
  }

  function rowClick(productId: string) {
    return () => router.push(`/admin/products/${productId}/edit`);
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">No products yet.</p>
          {canWrite && (
            <Button render={<Link href="/admin/products/new" />}>
              Create product
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-sidebar">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className={cn(headCellCn, "w-[34%]")}>Name</TableHead>
                <TableHead className={cn(headCellCn, "w-[30%]")}>
                  Category
                </TableHead>
                <TableHead className={cn(headCellCn, "w-[120px] text-right")}>
                  Price
                </TableHead>
                <TableHead className={cn(headCellCn, "w-[100px] text-right")}>
                  Stock
                </TableHead>
                <TableHead className={cn(headCellCn, "w-[140px]")}>
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const stockLow = product.stock < 5;
                const editHref = `/admin/products/${product.id}/edit`;
                return (
                  <TableRow
                    key={product.id}
                    onClick={rowClick(product.id)}
                    className={cn(
                      "cursor-pointer border-b border-border transition-colors hover:bg-muted/30",
                      !product.isActive && "opacity-60",
                    )}
                  >
                    <TableCell
                      className={cn(
                        bodyCellCn,
                        "text-[13px] font-semibold text-foreground",
                      )}
                    >
                      <Link
                        href={editHref}
                        onClick={(e) => e.stopPropagation()}
                        className="outline-none focus-visible:underline"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell
                      className={cn(bodyCellCn, "text-[13px] text-muted-foreground")}
                    >
                      {product.category.name}
                    </TableCell>
                    <TableCell
                      className={cn(
                        bodyCellCn,
                        "text-right font-mono text-[12.5px] font-medium text-foreground",
                      )}
                    >
                      ${product.basePrice.toString()}
                      <span className="ml-1 text-muted-foreground">
                        {product.priceType === "PER_UNIT" ? "/unit" : ""}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        bodyCellCn,
                        "text-right font-mono text-[12.5px]",
                        stockLow
                          ? "font-semibold text-warning"
                          : "text-foreground",
                      )}
                    >
                      {product.stock}
                    </TableCell>
                    <TableCell className={bodyCellCn}>
                      {canWrite ? (
                        <button
                          type="button"
                          onClick={(e) => handleToggle(product.id, e)}
                          disabled={isPending}
                          className="cursor-pointer disabled:opacity-60"
                        >
                          <StatusBadge
                            state={product.isActive ? "active" : "inactive"}
                          />
                        </button>
                      ) : (
                        <StatusBadge
                          state={product.isActive ? "active" : "inactive"}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-3.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {typeof total === "number"
              ? `Showing ${products.length} of ${total} products`
              : `Showing ${products.length} products`}
          </span>
          <Pagination className="mx-0 w-fit">
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
    </>
  );
}
