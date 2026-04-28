"use client";

import { useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { useUnavailableDates } from "@/hooks/use-unavailable-dates";

type Props = {
  productId: string;
  variantId?: string | null;
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  minDate: Date;
  className?: string;
};

/**
 * Single-day availability calendar shared between the public storefront
 * (AvailabilityCheckerBody) and the admin manual-order sheet. Owns the
 * visible month state + fetches unavailable days via useUnavailableDates so
 * both surfaces look and behave identically.
 */
export function AvailabilityCalendar({
  productId,
  variantId,
  selected,
  onSelect,
  minDate,
  className,
}: Props) {
  const [month, setMonth] = useState<Date>(() => selected ?? minDate);

  const { unavailableDates } = useUnavailableDates({
    productId,
    variantId,
    visibleMonth: month,
  });

  return (
    <div className={`w-full overflow-x-auto ${className ?? ""}`}>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        month={month}
        onMonthChange={setMonth}
        disabled={[{ before: minDate }, ...unavailableDates]}
        className="w-full"
      />
    </div>
  );
}
