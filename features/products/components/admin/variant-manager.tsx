"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { isFormError, getFieldErrors, type FormState as VariantFormState } from "@/lib/types/form-state";
import { formatAdminCurrency } from "@/lib/admin/format";
import { deleteVariant } from "../../actions";

type Variant = {
  id: string;
  name: string;
  price: string;
  stock: number;
};

type Props = {
  variants: Variant[];
  createAction: (
    prev: VariantFormState,
    formData: FormData,
  ) => Promise<VariantFormState>;
  updateAction: (
    variantId: string,
    prev: VariantFormState,
    formData: FormData,
  ) => Promise<VariantFormState>;
};

function VariantInlineForm({
  action,
  defaultValues,
  onCancel,
  submitLabel,
}: {
  action: (prev: VariantFormState, formData: FormData) => Promise<VariantFormState>;
  defaultValues?: { name?: string; price?: string; stock?: string };
  onCancel: () => void;
  submitLabel: string;
}) {
  const [state, setState] = useState<VariantFormState>({} as VariantFormState);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldErrors = getFieldErrors(state);

  const handleSubmit = () => {
    const container = containerRef.current;
    if (!container) return;
    const formData = new FormData();
    container.querySelectorAll<HTMLInputElement>("input[name]").forEach((input) => {
      formData.append(input.name, input.value);
    });
    startTransition(async () => {
      const result = await action(state, formData);
      setState(result);
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4"
    >
      {isFormError(state) && (
        <p className="text-xs text-red-600">{state.detail ?? state.title}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Nombre</Label>
          <Input
            name="name"
            defaultValue={defaultValues?.name}
            placeholder="ej. Rosa"
            required
          />
          {fieldErrors?.name && (
            <p className="text-xs text-red-600">{fieldErrors.name[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Precio</Label>
          <Input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.price}
            placeholder="0.00"
            required
          />
          {fieldErrors?.price && (
            <p className="text-xs text-red-600">{fieldErrors.price[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Existencias</Label>
          <Input
            name="stock"
            type="number"
            min="0"
            defaultValue={defaultValues?.stock ?? "1"}
            required
          />
          {fieldErrors?.stock && (
            <p className="text-xs text-red-600">{fieldErrors.stock[0]}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={handleSubmit}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function VariantManager({
  variants,
  createAction,
  updateAction,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(variantId: string) {
    setDeleting(variantId);
    try {
      const result = await deleteVariant(variantId);
      if (isFormError(result)) {
        toast.error(result.detail ?? result.title);
      }
    } catch {
      toast.error("No se pudo eliminar la variante");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Variantes</h2>
        {!showAdd && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="mr-1.5 size-3.5" />
            Agregar variante
          </Button>
        )}
      </div>

      {variants.length === 0 && !showAdd && (
        <p className="text-sm text-gray-500">
          Aún no hay variantes. Agrega variantes si este producto se ofrece en diferentes opciones (p. ej. colores, tallas).
        </p>
      )}

      {/* Existing variants */}
      {variants.map((variant) => (
        <div key={variant.id}>
          {editingId === variant.id ? (
            <VariantInlineForm
              action={updateAction.bind(null, variant.id)}
              defaultValues={{
                name: variant.name,
                price: variant.price,
                stock: variant.stock.toString(),
              }}
              onCancel={() => setEditingId(null)}
              submitLabel="Actualizar"
            />
          ) : (
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">{variant.name}</span>
                <span className="text-sm text-gray-500">
                  {formatAdminCurrency(variant.price)}
                </span>
                <span className="text-sm text-gray-500">
                  Existencias: {variant.stock}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(variant.id)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={deleting === variant.id}
                  onClick={() => handleDelete(variant.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new variant form */}
      {showAdd && (
        <VariantInlineForm
          action={createAction}
          onCancel={() => setShowAdd(false)}
          submitLabel="Agregar variante"
        />
      )}
    </div>
  );
}
