"use client";

import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteDialog } from "@/hooks/use-delete-dialog";
import { cn } from "@/lib/utils";

import { deleteZipcode } from "../../actions";
import { ZipcodeBulkImportDialog } from "./zipcode-bulk-import-dialog";
import { ZipcodeFormDialog } from "./zipcode-form-dialog";

type Zipcode = {
  id: string;
  city: string;
  zipCode: string;
  fee: string;
};

type Props = {
  zipcodes: Zipcode[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  canWrite?: boolean;
};

const headCellCn =
  "h-auto px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground";
const bodyCellCn = "px-[22px] py-[13px]";

export function ZipcodeTable({
  zipcodes,
  total,
  page,
  pageSize,
  search,
  canWrite = true,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Zipcode | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const {
    targetId: deleteId,
    isPending,
    openDialog: setDeleteId,
    closeDialog,
    confirmDelete,
  } = useDeleteDialog();

  function pushParams(updates: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "" || value === 0) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    router.push(`/admin/zipcodes${params.toString() ? `?${params}` : ""}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ q: searchValue || undefined, page: undefined });
  }

  function handleDelete() {
    confirmDelete(deleteZipcode, "Zipcode eliminado");
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex max-w-sm items-center gap-2">
          <Input
            placeholder="Buscar ciudad o zipcode…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" />
              Importar CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Crear zipcode
            </Button>
          </div>
        )}
      </div>

      {zipcodes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">
              {search
                ? `Sin resultados para "${search}".`
                : "Aún no hay zipcodes registrados."}
            </p>
            {canWrite && !search && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  Importar CSV
                </Button>
                <Button onClick={() => setCreateOpen(true)}>
                  Crear zipcode
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-sidebar">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className={cn(headCellCn, "w-[40%]")}>
                    Ciudad
                  </TableHead>
                  <TableHead className={cn(headCellCn, "w-[20%]")}>
                    Zipcode
                  </TableHead>
                  <TableHead className={cn(headCellCn)}>Tarifa</TableHead>
                  {canWrite && (
                    <TableHead
                      className={cn(headCellCn, "w-[110px] text-right")}
                    >
                      Acciones
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {zipcodes.map((zipcode) => (
                  <TableRow
                    key={zipcode.id}
                    className="border-b border-border last:border-b-0 hover:bg-transparent"
                  >
                    <TableCell
                      className={cn(
                        bodyCellCn,
                        "text-[13px] font-semibold text-foreground",
                      )}
                    >
                      {zipcode.city}
                    </TableCell>
                    <TableCell
                      className={cn(
                        bodyCellCn,
                        "font-mono text-[13px] text-foreground",
                      )}
                    >
                      {zipcode.zipCode}
                    </TableCell>
                    <TableCell
                      className={cn(bodyCellCn, "text-[13px] text-foreground")}
                    >
                      ${Number(zipcode.fee).toFixed(2)}
                    </TableCell>
                    {canWrite && (
                      <TableCell className={cn(bodyCellCn, "py-2")}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="text-muted-foreground"
                            onClick={() => setEditTarget(zipcode)}
                            aria-label="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(zipcode.id)}
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
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {showingFrom}–{showingTo} de {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushParams({ page: page - 1 })}
            >
              Anterior
            </Button>
            <span className="px-2">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: page + 1 })}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <ZipcodeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => router.refresh()}
      />

      <ZipcodeFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        initial={editTarget}
        onSaved={() => router.refresh()}
      />

      <ZipcodeBulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => router.refresh()}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zipcode?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las órdenes existentes con este
              zipcode mantienen su tarifa original.
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
