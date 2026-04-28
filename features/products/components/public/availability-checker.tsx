"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUnavailableDates } from "../../hooks/use-unavailable-dates";
import { fetchAvailability } from "../../services/availability.client-service";

export type AvailabilityLabels = {
  checkDates: string;
  selectDate: string;
  loading: string;
  available: string;
  notAvailable: string;
  unitsAvailable: string;
  errorFetch: string;
};

export type AvailabilityResult = {
  date: Date;
  available: number;
};

export type AvailabilityCheckerProps = {
  productId: string;
  variantId?: string | null;
  pricingModel: "FIXED" | "PER_UNIT";
  stock: number;
  labels: AvailabilityLabels;
  onAvailabilityConfirmed?: (result: AvailabilityResult) => void;
  onUnavailable?: () => void;
};

type AvailabilityStatus =
  | "idle"
  | "loading"
  | "available"
  | "unavailable"
  | "error";

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AvailabilityCheckerBody({
  productId,
  variantId,
  pricingModel,
  labels,
  onAvailabilityConfirmed,
  onUnavailable,
}: AvailabilityCheckerProps) {
  const tomorrow = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  })();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [visibleMonth, setVisibleMonth] = useState<Date>(tomorrow);
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [available, setAvailable] = useState(0);

  const { unavailableDates } = useUnavailableDates({
    productId,
    variantId,
    visibleMonth,
  });

  useEffect(() => {
    if (!selectedDate) return;

    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetchAvailability({
          productId,
          variantId,
          date: toDateString(selectedDate),
        });
        if (!response.ok) {
          setStatus("error");
          onUnavailable?.();
          return;
        }
        setAvailable(response.available);
        setStatus(response.available > 0 ? "available" : "unavailable");
        if (response.available > 0 && onAvailabilityConfirmed) {
          onAvailabilityConfirmed({
            date: selectedDate,
            available: response.available,
          });
        } else if (response.available <= 0) {
          onUnavailable?.();
        }
      } catch {
        setStatus("error");
        onUnavailable?.();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    onAvailabilityConfirmed,
    onUnavailable,
    productId,
    selectedDate,
    variantId,
  ]);

  function handleSelect(date: Date | undefined) {
    setSelectedDate(date);
    setStatus("idle");
    if (!date) onUnavailable?.();
  }

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {labels.selectDate}
        </span>
        <span className="font-semibold">
          {selectedDate ? format(selectedDate, "MMM d, yyyy") : "—"}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          disabled={[{ before: tomorrow }, ...unavailableDates]}
          className="w-full"
        />
      </div>

      <Separator />
      <div
        role="status"
        aria-live="polite"
        data-testid="availability-status"
        className="min-h-5"
      >
        {renderStatus()}
      </div>
    </div>
  );
}

export function AvailabilityChecker(props: AvailabilityCheckerProps) {
  return (
    <Card className="max-w-xs">
      <CardHeader>
        <CardTitle className="font-bold">{props.labels.checkDates}</CardTitle>
      </CardHeader>
      <CardContent>
        <AvailabilityCheckerBody {...props} />
      </CardContent>
    </Card>
  );
}
