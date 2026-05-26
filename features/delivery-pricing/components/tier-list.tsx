"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { createTier, deleteTier, updateTier } from "../actions";
import type { DistanceTier } from "../services/distance-pricing.service";
import { TierForm } from "./tier-form";

type Props = {
  tiers: DistanceTier[];
  canWrite: boolean;
};

export function TierList({ tiers, canWrite }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    setPendingDelete(id);
    startTransition(async () => {
      await deleteTier(id);
      setPendingDelete(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay tramos. Agrega el primero (debe empezar en 0 millas).
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Desde (mi)</TableHead>
              <TableHead>Hasta (mi)</TableHead>
              <TableHead className="text-right">Tarifa</TableHead>
              {canWrite && <TableHead className="w-px" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) =>
              editingId === tier.id ? (
                <TableRow key={tier.id}>
                  <TableCell colSpan={canWrite ? 4 : 3}>
                    <TierForm
                      action={updateTier.bind(null, tier.id)}
                      defaultValues={{
                        minMiles: tier.minMiles,
                        maxMiles: tier.maxMiles,
                        fee: tier.fee,
                      }}
                      submitLabel="Guardar"
                      onSuccess={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={tier.id}>
                  <TableCell>{tier.minMiles.toFixed(2)}</TableCell>
                  <TableCell>{tier.maxMiles.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    ${tier.fee.toFixed(2)}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Editar tramo"
                          onClick={() => setEditingId(tier.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Eliminar tramo"
                          disabled={pendingDelete === tier.id}
                          onClick={() => handleDelete(tier.id)}
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
          <p className="mb-3 text-sm font-medium">Agregar tramo</p>
          <TierForm action={createTier} submitLabel="Agregar" />
        </div>
      )}
    </div>
  );
}
