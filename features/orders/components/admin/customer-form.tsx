"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { searchCustomerSuggestions } from "@/features/orders/actions";
import { generateEventHours } from "@/features/settings/services/event-window.service";

export type CustomerFormValue = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  eventStartTime?: string;
};

type Props = {
  value: CustomerFormValue;
  onChange: (value: CustomerFormValue) => void;
  eventWindowStart?: string | null;
  eventWindowEnd?: string | null;
};

type Suggestion = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string | null;
};

const DEBOUNCE_MS = 250;

export function CustomerForm({
  value,
  onChange,
  eventWindowStart,
  eventWindowEnd,
}: Props) {
  const eventHours = generateEventHours(
    eventWindowStart ?? null,
    eventWindowEnd ?? null,
  );
  const hasEventWindow = eventHours.length > 0;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = value.customerName.trim();
    if (query.length < 2) return;

    debounceRef.current = setTimeout(async () => {
      const result = await searchCustomerSuggestions(query);
      setSuggestions(result);
      setOpen(result.length > 0);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value.customerName]);

  function applySuggestion(s: Suggestion) {
    onChange({
      customerName: s.customerName,
      customerEmail: s.customerEmail,
      customerPhone: s.customerPhone,
      deliveryAddress: s.deliveryAddress ?? "",
    });
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Label htmlFor="customerName">Nombre</Label>
          <Input
            id="customerName"
            value={value.customerName}
            onChange={(e) => {
              const next = e.target.value;
              onChange({ ...value, customerName: next });
              if (next.trim().length < 2) {
                setSuggestions([]);
                setOpen(false);
              }
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Nombre del cliente"
            autoComplete="off"
          />
          {open && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
              data-testid="customer-suggestions"
            >
              {suggestions.map((s) => (
                <li
                  key={`${s.customerEmail}-${s.customerPhone}`}
                  role="option"
                  aria-selected="false"
                  className="cursor-pointer rounded-sm px-2 py-1.5 hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySuggestion(s);
                  }}
                >
                  <span className="font-medium">{s.customerName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.customerEmail} · {s.customerPhone}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Label htmlFor="customerEmail">Email</Label>
          <Input
            id="customerEmail"
            type="email"
            value={value.customerEmail}
            onChange={(e) =>
              onChange({ ...value, customerEmail: e.target.value })
            }
            placeholder="cliente@ejemplo.com"
          />
        </div>

        <div>
          <Label htmlFor="customerPhone">Teléfono</Label>
          <Input
            id="customerPhone"
            value={value.customerPhone}
            onChange={(e) =>
              onChange({ ...value, customerPhone: e.target.value })
            }
            placeholder="555-1234"
          />
        </div>

        <div>
          <Label htmlFor="deliveryAddress">Dirección (opcional)</Label>
          <Input
            id="deliveryAddress"
            value={value.deliveryAddress}
            onChange={(e) =>
              onChange({ ...value, deliveryAddress: e.target.value })
            }
            placeholder="Calle 123, Ciudad"
          />
        </div>

        {hasEventWindow && (
          <div className="sm:col-span-2">
            <Label htmlFor="eventStartTime">
              Hora de inicio del evento (opcional)
            </Label>
            <Select
              value={value.eventStartTime ?? ""}
              onValueChange={(val) =>
                onChange({
                  ...value,
                  eventStartTime: val == null || val === "" ? undefined : val,
                })
              }
            >
              <SelectTrigger id="eventStartTime">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin especificar</SelectItem>
                {eventHours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
