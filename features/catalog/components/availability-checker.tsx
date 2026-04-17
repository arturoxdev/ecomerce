"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ArrowRight } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type AvailabilityLabels = {
  checkDates: string;
  startDate: string;
  endDate: string;
  loading: string;
  available: string;
  notAvailable: string;
  unitsAvailable: string;
  invalidRange: string;
  errorFetch: string;
};

export type AvailabilityResult = {
  startDate: Date;
  endDate: Date;
  available: number;
};

export type AvailabilityCheckerProps = {
  productId: string;
  variantId?: string | null;
  pricingModel: "FIXED" | "PER_UNIT";
  stock: number;
  labels: AvailabilityLabels;
  onAvailabilityConfirmed?: (result: AvailabilityResult) => void;
};

type AvailabilityStatus =
  | "idle"
  | "loading"
  | "available"
  | "unavailable"
  | "error"
  | "invalid";

type ActiveField = "start" | "end";

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function countDays(from: Date, to: Date): number {
  const diff = differenceInCalendarDays(to, from);
  return Math.max(1, diff);
}

export function AvailabilityChecker({
  productId,
  variantId,
  pricingModel,
  labels,
  onAvailabilityConfirmed,
}: AvailabilityCheckerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeField, setActiveField] = useState<ActiveField>("start");
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [available, setAvailable] = useState(0);

  const startDate = dateRange?.from;
  const endDate = dateRange?.to;
  const hasValidRange = Boolean(startDate && endDate && endDate >= startDate);

  // When user clicks "Start Date" pill, clear range so next click sets a fresh start
  function handleStartClick() {
    setDateRange(undefined);
    setActiveField("start");
  }

  function handleEndClick() {
    setActiveField("end");
  }

  function handleSelect(range: DateRange | undefined) {
    if (!range) {
      setDateRange(undefined);
      return;
    }

    if (activeField === "start") {
      // Range was cleared — this click sets the new start
      if (range.from) {
        setDateRange({ from: range.from, to: undefined });
        setActiveField("end");
      }
    } else {
      // activeField === "end"
      if (range.from && range.to) {
        if (range.to < range.from) {
          setDateRange({ from: range.to, to: range.from });
        } else {
          setDateRange(range);
        }
      } else if (range.from && !range.to && startDate) {
        const clicked = range.from;
        if (clicked < startDate) {
          setDateRange({ from: clicked, to: startDate });
        } else {
          setDateRange({ from: startDate, to: clicked });
        }
      } else {
        setDateRange(range);
      }
    }
  }

  useEffect(() => {
    if (!hasValidRange || !startDate || !endDate) {
      return;
    }

    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams({
          productId,
          start: toDateString(startDate),
          end: toDateString(endDate),
        });
        if (variantId) params.set("variantId", variantId);
        const res = await fetch(`/api/availability?${params}`);
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data = await res.json();
        const avail = Math.max(0, data.available);
        setAvailable(avail);
        setStatus(avail > 0 ? "available" : "unavailable");
        if (avail > 0 && onAvailabilityConfirmed) {
          onAvailabilityConfirmed({ startDate, endDate, available: avail });
        }
      } catch {
        setStatus("error");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [endDate, hasValidRange, productId, startDate, variantId]);

  const dayCount = startDate && endDate ? countDays(startDate, endDate) : null;

  function renderStatus() {
    switch (status) {
      case "idle":
        return null;
      case "loading":
        return (
          <p className="animate-pulse text-sm text-muted-foreground">
            {labels.loading}
          </p>
        );
      case "available":
        return (
          <p className="text-sm font-semibold text-green-600">
            {pricingModel === "PER_UNIT"
              ? `${available} ${labels.unitsAvailable}`
              : labels.available}
          </p>
        );
      case "unavailable":
        return (
          <p className="text-sm font-semibold text-red-600">
            {labels.notAvailable}
          </p>
        );
      case "error":
        return (
          <p className="text-sm font-semibold text-amber-600">
            {labels.errorFetch}
          </p>
        );
      default:
        return null;
    }
  }

  return (
    <Card className="max-w-xs">
      <CardHeader>
        <CardTitle className="font-bold">{labels.checkDates}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Date pills — always visible, clickable to toggle active field */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleStartClick}
            className={cn(
              "flex flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
              activeField === "start"
                ? "border-secondary bg-background-light"
                : "border-border bg-card"
            )}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {labels.startDate}
            </span>
            <span className={cn(
              "flex items-center gap-1.5 text-sm font-semibold",
              startDate ? "text-secondary" : "text-muted-foreground"
            )}>
              <CalendarDays className="size-3.5" />
              {startDate ? format(startDate, "MMM d, yyyy") : "—"}
            </span>
          </button>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          <button
            type="button"
            onClick={handleEndClick}
            className={cn(
              "flex flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
              activeField === "end"
                ? "border-secondary bg-background-light"
                : "border-border bg-card"
            )}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {labels.endDate}
            </span>
            <span className={cn(
              "flex items-center gap-1.5 text-sm font-semibold",
              endDate ? "text-secondary" : "text-muted-foreground"
            )}>
              <CalendarDays className="size-3.5" />
              {endDate ? format(endDate, "MMM d, yyyy") : "—"}
            </span>
          </button>
        </div>

        {/* Calendar */}
        <div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleSelect}
            disabled={{ before: today }}
            className="w-full"
          />
        </div>

        {/* Day counter + status */}
        {dayCount !== null && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {dayCount} {dayCount === 1 ? "day" : "days"}
              </span>
              <div
                role="status"
                aria-live="polite"
                data-testid="availability-status"
              >
                {renderStatus()}
              </div>
            </div>
          </>
        )}

        {dayCount === null && (
          <div
            role="status"
            aria-live="polite"
            data-testid="availability-status"
          >
            {renderStatus()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
