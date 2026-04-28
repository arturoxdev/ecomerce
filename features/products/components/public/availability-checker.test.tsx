import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <button
      type="button"
      onClick={() => onSelect(new Date(2099, 4, 10, 12))}
    >
      Select mocked date
    </button>
  ),
}));

vi.mock("../../hooks/use-unavailable-dates", () => ({
  useUnavailableDates: () => ({ unavailableDates: [], loading: false }),
}));

import { AvailabilityChecker } from "./availability-checker";

describe("AvailabilityChecker", () => {
  const labels = {
    checkDates: "Check dates",
    selectDate: "Select a date",
    loading: "Loading",
    available: "Available",
    notAvailable: "Not available",
    unitsAvailable: "units available",
    errorFetch: "Could not check availability",
  };

  beforeEach(() => {
    cleanup();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("✅ Happy path", () => {
    it("valid date with availability -> renders units and confirms selection", async () => {
      const onAvailabilityConfirmed = vi.fn();
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue({
          ok: true,
          json: async () => ({ available: 3, pricingModel: "PER_UNIT" }),
        } as Response);

      render(
        <AvailabilityChecker
          productId="product-1"
          pricingModel="PER_UNIT"
          stock={5}
          labels={labels}
          onAvailabilityConfirmed={onAvailabilityConfirmed}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Select mocked date" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(401);
      });

      expect(screen.getByText("3 units available")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/availability?productId=product-1&date=2099-05-10",
      );
      expect(onAvailabilityConfirmed).toHaveBeenCalledWith({
        date: new Date(2099, 4, 10, 12),
        available: 3,
      });
    });
  });

  describe("💥 Error states", () => {
    it("availability request failure -> renders fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
      } as Response);

      render(
        <AvailabilityChecker
          productId="product-1"
          pricingModel="FIXED"
          stock={1}
          labels={labels}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Select mocked date" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(401);
      });

      expect(screen.getByText("Could not check availability")).toBeInTheDocument();
    });
  });
});
