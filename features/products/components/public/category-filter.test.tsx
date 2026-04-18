import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/en/catalog",
}));

import { CategoryFilter } from "./category-filter";

describe("CategoryFilter", () => {
  const categories = [
    { id: "c1", name: "Chairs", slug: "chairs" },
    { id: "c2", name: "Tables", slug: "tables" },
  ];

  beforeEach(() => push.mockReset());
  afterEach(() => cleanup());

  it("click All -> router.push pathname without query", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <CategoryFilter
        categories={categories}
        currentSlug="chairs"
        allLabel="All"
      />,
    );

    // Act
    await user.click(screen.getByRole("button", { name: "All" }));

    // Assert
    expect(push).toHaveBeenCalledWith("/en/catalog");
  });

  it("click category -> router.push with category query", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <CategoryFilter
        categories={categories}
        currentSlug={null}
        allLabel="All"
      />,
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Tables" }));

    // Assert
    expect(push).toHaveBeenCalledWith("/en/catalog?category=tables");
  });

  it("currentSlug matches category -> that button renders with active classes", () => {
    // Arrange / Act
    render(
      <CategoryFilter
        categories={categories}
        currentSlug="chairs"
        allLabel="All"
      />,
    );

    // Assert
    const chairs = screen.getByRole("button", { name: "Chairs" });
    expect(chairs.className).toContain("bg-primary");
  });
});
