import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect: (range: { from: Date; to: Date }) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          from: new Date(2026, 4, 10, 12),
          to: new Date(2026, 4, 12, 12),
        })
      }
    >
      Select mocked range
    </button>
  ),
}));

import { AvailabilityChecker } from "./availability-checker";

describe("AvailabilityChecker", () => {
  const labels = {
    checkDates: "Check dates",
    startDate: "Start Date",
    endDate: "End Date",
    loading: "Loading",
    available: "Available",
    notAvailable: "Not available",
    unitsAvailable: "units available",
    invalidRange: "Invalid range",
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
    it("valid date range with availability -> renders units and confirms selection", async () => {
      // Arrange
      const onAvailabilityConfirmed = vi.fn();
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue({
          ok: true,
          json: async () => ({ available: 3 }),
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

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Select mocked range" }));
      fireEvent.click(screen.getByRole("button", { name: "Select mocked range" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(401);
      });

      // Assert
      expect(screen.getByText("3 units available")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/availability?productId=product-1&start=2026-05-10&end=2026-05-12",
      );
      expect(onAvailabilityConfirmed).toHaveBeenCalledWith({
        startDate: new Date(2026, 4, 10, 12),
        endDate: new Date(2026, 4, 12, 12),
        available: 3,
      });
    });
  });

  describe("💥 Error states", () => {
    it("availability request failure -> renders fetch error", async () => {
      // Arrange
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

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Select mocked range" }));
      fireEvent.click(screen.getByRole("button", { name: "Select mocked range" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(401);
      });

      // Assert
      expect(screen.getByText("Could not check availability")).toBeInTheDocument();
    });
  });
});
