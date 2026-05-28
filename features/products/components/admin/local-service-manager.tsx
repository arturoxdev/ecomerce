"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  isFormError,
  getFieldErrors,
  type FormState as LocalServiceFormState,
} from "@/lib/types/form-state";
import { formatAdminCurrency } from "@/lib/admin/format";
import { deleteLocalService } from "../../actions";

type LocalService = {
  id: string;
  name: string;
  price: string;
  description: string | null;
  isActive: boolean;
};

type Props = {
  services: LocalService[];
  createAction: (
    prev: LocalServiceFormState,
    formData: FormData,
  ) => Promise<LocalServiceFormState>;
  updateAction: (
    serviceId: string,
    prev: LocalServiceFormState,
    formData: FormData,
  ) => Promise<LocalServiceFormState>;
};

function LocalServiceInlineForm({
  action,
  defaultValues,
  onCancel,
  submitLabel,
}: {
  action: (
    prev: LocalServiceFormState,
    formData: FormData,
  ) => Promise<LocalServiceFormState>;
  defaultValues?: {
    name?: string;
    price?: string;
    description?: string;
    isActive?: boolean;
  };
  onCancel: () => void;
  submitLabel: string;
}) {
  const [state, setState] = useState<LocalServiceFormState>(
    {} as LocalServiceFormState,
  );
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldErrors = getFieldErrors(state);

  const handleSubmit = () => {
    const container = containerRef.current;
    if (!container) return;
    const formData = new FormData();
    container
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input[name], textarea[name]",
      )
      .forEach((field) => {
        if (field instanceof HTMLInputElement && field.type === "checkbox") {
          formData.append(field.name, field.checked ? "true" : "false");
        } else {
          formData.append(field.name, field.value);
        }
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Nombre</Label>
          <Input
            name="name"
            defaultValue={defaultValues?.name}
            placeholder="ej. Seguro"
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
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Descripción (opcional)</Label>
        <textarea
          name="description"
          defaultValue={defaultValues?.description}
          maxLength={500}
          rows={2}
          placeholder="Describe el servicio adicional"
          className="min-h-[60px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {fieldErrors?.description && (
          <p className="text-xs text-red-600">{fieldErrors.description[0]}</p>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          name="isActive"
          type="checkbox"
          value="true"
          defaultChecked={defaultValues?.isActive ?? true}
          className="size-4 rounded border-gray-300"
        />
        Activo
      </label>
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

export function LocalServiceManager({
  services,
  createAction,
  updateAction,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(serviceId: string) {
    setDeleting(serviceId);
    try {
      const result = await deleteLocalService(serviceId);
      if (isFormError(result)) {
        toast.error(result.detail ?? result.title);
      }
    } catch {
      toast.error("No se pudo eliminar el servicio");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Servicios adicionales
        </h2>
        {!showAdd && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="mr-1.5 size-3.5" />
            Agregar servicio
          </Button>
        )}
      </div>

      {services.length === 0 && !showAdd && (
        <p className="text-sm text-gray-500">
          Aún no hay servicios adicionales. Agrega extras opcionales que el
          cliente puede sumar a este producto (p. ej. seguro, instalación).
        </p>
      )}

      {/* Existing services */}
      {services.map((service) => (
        <div key={service.id}>
          {editingId === service.id ? (
            <LocalServiceInlineForm
              action={updateAction.bind(null, service.id)}
              defaultValues={{
                name: service.name,
                price: service.price,
                description: service.description ?? "",
                isActive: service.isActive,
              }}
              onCancel={() => setEditingId(null)}
              submitLabel="Actualizar"
            />
          ) : (
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-4">
                <span className="font-medium text-gray-900">
                  {service.name}
                </span>
                <span className="text-sm text-gray-500">
                  {formatAdminCurrency(service.price)}
                </span>
                {service.description && (
                  <span className="truncate text-sm text-gray-400">
                    {service.description}
                  </span>
                )}
                {!service.isActive && (
                  <span className="text-xs text-gray-400">Inactivo</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(service.id)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={deleting === service.id}
                  onClick={() => handleDelete(service.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new service form */}
      {showAdd && (
        <LocalServiceInlineForm
          action={createAction}
          onCancel={() => setShowAdd(false)}
          submitLabel="Agregar servicio"
        />
      )}
    </div>
  );
}
