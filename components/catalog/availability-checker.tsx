"use client";

import { useEffect, useState } from "react";

export type AvailabilityLabels = {
  checkDates: string; // "Check Availability"
  startDate: string; // "Start Date"
  endDate: string; // "End Date"
  loading: string; // "Checking availability..."
  available: string; // "Available"
  notAvailable: string; // "Not available for selected dates"
  unitsAvailable: string; // "units available"
  invalidRange: string; // "End date must be after start date"
  errorFetch: string; // "Could not check availability. Please try again."
};

export type AvailabilityCheckerProps = {
  productId: string;
  pricingModel: "FIXED" | "PER_UNIT";
  stock: number;
  labels: AvailabilityLabels;
};

type AvailabilityStatus =
  | "idle"
  | "loading"
  | "available"
  | "unavailable"
  | "error"
  | "invalid";

export function AvailabilityChecker({
  productId,
  pricingModel,
  labels,
}: AvailabilityCheckerProps) {
  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [available, setAvailable] = useState(0);
  const hasValidRange = Boolean(startDate && endDate && endDate > startDate);
  const resolvedStatus: AvailabilityStatus =
    !startDate || !endDate
      ? "idle"
      : endDate <= startDate
        ? "invalid"
        : status;

  useEffect(() => {
    if (!hasValidRange) {
      return;
    }

    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(
          `/api/availability?productId=${productId}&start=${startDate}&end=${endDate}`
        );
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data = await res.json();
        const avail = Math.max(0, data.available); // client-side guard: no negatives
        setAvailable(avail);
        setStatus(avail > 0 ? "available" : "unavailable");
      } catch {
        setStatus("error");
      }
    }, 400);

    // Cleanup: cancel timer on re-run
    return () => clearTimeout(timer);
  }, [endDate, hasValidRange, productId, startDate]);

  function renderStatus() {
    switch (resolvedStatus) {
      case "idle":
        return (
          <p className="text-sm text-slate-500">
            (select dates to check availability)
          </p>
        );
      case "loading":
        return (
          <p className="animate-pulse text-sm text-slate-600">
            {labels.loading}
          </p>
        );
      case "available":
        return (
          <p className="text-sm font-semibold text-green-600">
            ✅{" "}
            {pricingModel === "PER_UNIT"
              ? `${available} ${labels.unitsAvailable}`
              : labels.available}
          </p>
        );
      case "unavailable":
        return (
          <p className="text-sm font-semibold text-red-600">
            ❌ {labels.notAvailable}
          </p>
        );
      case "invalid":
        return (
          <p className="text-sm font-semibold text-amber-600">
            ⚠️ {labels.invalidRange}
          </p>
        );
      case "error":
        return (
          <p className="text-sm font-semibold text-amber-600">
            ⚠️ {labels.errorFetch}
          </p>
        );
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <h3 className="text-base font-semibold text-slate-900">
        {labels.checkDates}
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="availability-start"
            className="text-sm font-medium text-slate-700"
          >
            {labels.startDate}
          </label>
          <input
            id="availability-start"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="availability-end"
            className="text-sm font-medium text-slate-700"
          >
            {labels.endDate}
          </label>
          <input
            id="availability-end"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div role="status" aria-live="polite">
        {renderStatus()}
      </div>
    </div>
  );
}
