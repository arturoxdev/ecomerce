"use client";

import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountPill } from "@/components/admin/count-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { deleteCategory, updateCategoryOrder } from "../../actions";

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
  canWrite?: boolean;
};

const headCellCn =
  "h-auto px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground";
const bodyCellCn = "px-[22px] py-[13px]";

export function CategoryTable({ categories, canWrite = true }: Props) {
  const {
    targetId: deleteId,
    isPending,
    startTransition,
    openDialog: setDeleteId,
    closeDialog,
    confirmDelete,
  } = useDeleteDialog();

  function handleReorder(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const items = categories.map((c, i) => {
      if (i === index)
        return { id: c.id, sortOrder: categories[swapIndex].sortOrder };
      if (i === swapIndex)
        return { id: c.id, sortOrder: categories[index].sortOrder };
      return { id: c.id, sortOrder: c.sortOrder };
    });

    startTransition(async () => {
      const result = await updateCategoryOrder(items);
      if ("type" in result) {
        toast.error(result.detail ?? result.title);
      }
    });
  }

  function handleDelete() {
    confirmDelete(deleteCategory, "Categoría eliminada");
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">Aún no hay categorías.</p>
          <Button render={<Link href="/admin/categories/new" />}>
            Crear categoría
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-sidebar">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className={cn(headCellCn, "w-[20%]")}>Nombre</TableHead>
                <TableHead className={cn(headCellCn, "w-[18%]")}>Slug</TableHead>
                <TableHead className={cn(headCellCn)}>Descripción</TableHead>
                <TableHead className={cn(headCellCn, "w-[110px] text-center")}>
                  Productos
                </TableHead>
                {canWrite && (
                  <TableHead className={cn(headCellCn, "w-[90px] text-center")}>
                    Orden
                  </TableHead>
                )}
                {canWrite && (
                  <TableHead className={cn(headCellCn, "w-[110px] text-right")}>
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, index) => (
                <TableRow
                  key={category.id}
                  className="border-b border-border last:border-b-0 hover:bg-transparent"
                >
                  <TableCell
                    className={cn(
                      bodyCellCn,
                      "text-[13px] font-semibold text-foreground",
                    )}
                  >
                    {category.name}
                  </TableCell>
                  <TableCell
                    className={cn(
                      bodyCellCn,
                      "font-mono text-xs text-muted-foreground",
                    )}
                  >
                    {category.slug}
                  </TableCell>
                  <TableCell
                    className={cn(
                      bodyCellCn,
                      "max-w-0 truncate text-[13px] text-muted-foreground",
                    )}
                  >
                    {category.description ?? "—"}
                  </TableCell>
                  <TableCell className={cn(bodyCellCn, "text-center")}>
                    <CountPill value={category._count.products} />
                  </TableCell>
                  {canWrite && (
                    <TableCell className={cn(bodyCellCn, "py-2")}>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="text-muted-foreground"
                          onClick={() => handleReorder(index, "up")}
                          disabled={index === 0 || isPending}
                          aria-label="Mover arriba"
                        >
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="text-muted-foreground"
                          onClick={() => handleReorder(index, "down")}
                          disabled={
                            index === categories.length - 1 || isPending
                          }
                          aria-label="Mover abajo"
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {canWrite && (
                    <TableCell className={cn(bodyCellCn, "py-2")}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="text-muted-foreground"
                          render={
                            <Link
                              href={`/admin/categories/${category.id}/edit`}
                            />
                          }
                          aria-label="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(category.id)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las categorías con productos asociados no pueden eliminarse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30"
            >
              {isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
