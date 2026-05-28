"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type SelectableService = {
  id: string;
  name: string;
  price: number;
  description: string | null;
};

export type ServiceSelectorLabels = {
  sectionTitle: string;
  optionalAddOns: string;
};

type Props = {
  services: SelectableService[];
  selectedIds: string[];
  onToggle: (service: SelectableService, checked: boolean) => void;
  labels: ServiceSelectorLabels;
};

export function ServiceSelector({
  services,
  selectedIds,
  onToggle,
  labels,
}: Props) {
  if (services.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-500">
          {labels.sectionTitle}
        </p>
        <p className="text-xs text-slate-400">{labels.optionalAddOns}</p>
      </div>
      <div className="flex flex-col gap-2">
        {services.map((service) => {
          const checked = selectedIds.includes(service.id);
          return (
            <label
              key={service.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                checked
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 hover:border-primary/40",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => onToggle(service, value === true)}
                className="mt-0.5"
              />
              <div className="flex flex-1 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {service.name}
                  </p>
                  {service.description && (
                    <p className="text-xs text-slate-500">
                      {service.description}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold text-primary">
                  +${service.price.toFixed(2)}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
