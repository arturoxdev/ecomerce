"use client";

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  createService,
  deleteService,
  toggleServiceActive,
  updateService,
} from "../actions";
import type { GlobalService } from "../types";
import { ServiceForm } from "./service-form";

type Props = {
  services: GlobalService[];
  canWrite: boolean;
};

export function ServiceList({ services, canWrite }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await deleteService(id);
      setPendingId(null);
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    setPendingId(id);
    startTransition(async () => {
      await toggleServiceActive(id, isActive);
      setPendingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay servicios adicionales. Agrega el primero.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              {canWrite && <TableHead className="w-px" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) =>
              editingId === service.id ? (
                <TableRow key={service.id}>
                  <TableCell colSpan={canWrite ? 5 : 4}>
                    <ServiceForm
                      action={updateService.bind(null, service.id)}
                      defaultValues={{
                        name: service.name,
                        price: service.price,
                        description: service.description,
                        isActive: service.isActive,
                        sortOrder: service.sortOrder,
                      }}
                      submitLabel="Guardar"
                      onSuccess={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="text-right">
                    ${service.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {service.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      state={service.isActive ? "active" : "inactive"}
                    />
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={
                            service.isActive
                              ? "Desactivar servicio"
                              : "Activar servicio"
                          }
                          disabled={pendingId === service.id}
                          onClick={() =>
                            handleToggle(service.id, !service.isActive)
                          }
                        >
                          {service.isActive ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Editar servicio"
                          onClick={() => setEditingId(service.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Eliminar servicio"
                          disabled={pendingId === service.id}
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      )}

      {canWrite && (
        <div className="rounded-md border border-dashed border-border p-4">
          <p className="mb-3 text-sm font-medium">Agregar servicio</p>
          <ServiceForm action={createService} submitLabel="Agregar" />
        </div>
      )}
    </div>
  );
}
