"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
};

export function QuantitySelector({ value, min = 1, max, onChange, label }: Props) {
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-sm font-medium text-slate-500">{label}</span>
      )}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-10 text-center text-sm font-semibold tabular-nums">
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <span className="text-xs text-slate-400">max {max}</span>
    </div>
  );
}
