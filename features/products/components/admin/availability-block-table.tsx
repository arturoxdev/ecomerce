"use client";

import { Trash2 } from "lucide-react";
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
import { formatAdminDate } from "@/lib/admin/format";
import { toDisplayDate } from "@/lib/date";

import { deleteManualBlock } from "../../actions";

type Block = {
  id: string;
  date: Date;
  quantity: number;
  reason: string | null;
  orderId: string | null;
  order: { id: string; customerName: string } | null;
};

type Props = {
  blocks: Block[];
};

export function AvailabilityBlockTable({ blocks }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteManualBlock(deleteId);
      setDeleteId(null);
      if ("type" in result) {
        toast.error(result.detail ?? result.title);
      } else {
        toast.success("Bloqueo eliminado");
        router.refresh();
      }
    });
  }

  if (blocks.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        No hay bloqueos registrados
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="w-16">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blocks.map((block) => (
            <TableRow key={block.id}>
              <TableCell>
                {block.orderId === null ? (
                  <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    Bloqueo manual
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Reservación — {block.order?.customerName}
                  </span>
                )}
              </TableCell>
              <TableCell>{formatAdminDate(toDisplayDate(block.date))}</TableCell>
              <TableCell>{block.quantity}</TableCell>
              <TableCell className="max-w-xs truncate text-sm text-gray-500">
                {block.reason ?? "—"}
              </TableCell>
              <TableCell>
                {block.orderId === null && (
                  <button
                    onClick={() => setDeleteId(block.id)}
                    className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar bloqueo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará el bloqueo manual y liberará la disponibilidad para esas fechas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
