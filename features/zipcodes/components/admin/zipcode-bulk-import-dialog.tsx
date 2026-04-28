"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { bulkImportZipcodes } from "../../actions";
import type { BulkImportFormState } from "../../services/zipcodes-admin.service";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

function isImportError(state: BulkImportFormState): state is Extract<
  BulkImportFormState,
  { type: string }
> {
  return "type" in state;
}

function isImportSuccess(state: BulkImportFormState): state is Extract<
  BulkImportFormState,
  { success: true }
> {
  return "success" in state && state.success === true;
}

export function ZipcodeBulkImportDialog({
  open,
  onOpenChange,
  onImported,
}: Props) {
  const [state, formAction, pending] = useActionState(
    bulkImportZipcodes,
    {} as BulkImportFormState,
  );
  const [deleteAbsent, setDeleteAbsent] = useState(false);

  useEffect(() => {
    if (isImportSuccess(state)) {
      const { insertedN, updatedN, deletedN } = state.summary;
      toast.success(
        `Importación completada: ${insertedN} nuevos, ${updatedN} actualizados, ${deletedN} eliminados`,
      );
      onImported?.();
      onOpenChange(false);
    }
  }, [state, onImported, onOpenChange]);

  const errorState = isImportError(state) ? state : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar zipcodes desde CSV</DialogTitle>
          <DialogDescription>
            El archivo debe tener encabezado{" "}
            <code className="font-mono">zipcode,fee</code>, separador coma,
            codificación UTF-8 y máximo 2 MB.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {errorState && !errorState.rowErrors && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorState.detail ?? errorState.title}
            </p>
          )}

          {errorState?.rowErrors && errorState.rowErrors.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md bg-red-50 p-3 text-xs text-red-800">
              <p className="mb-2 font-semibold">
                Errores en {errorState.rowErrors.length} fila(s):
              </p>
              <ul className="space-y-1">
                {errorState.rowErrors.slice(0, 50).map((rowError, idx) => (
                  <li key={`${rowError.row}-${idx}`}>
                    Fila {rowError.row}
                    {rowError.zipcode ? ` (${rowError.zipcode})` : ""}:{" "}
                    {rowError.error}
                  </li>
                ))}
                {errorState.rowErrors.length > 50 && (
                  <li className="italic">
                    … y {errorState.rowErrors.length - 50} errores más
                  </li>
                )}
              </ul>
            </div>
          )}

          <Field label="Archivo CSV">
            <Input type="file" name="file" accept=".csv,text/csv" required />
          </Field>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="deleteAbsent"
              value="true"
              checked={deleteAbsent}
              onChange={(e) => setDeleteAbsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">
                Borrar zipcodes ausentes del CSV
              </span>
              <span className="block text-xs text-muted-foreground">
                Si se activa, se eliminan los zipcodes que existan en la base y
                no estén en el archivo.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Importando…" : "Importar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
