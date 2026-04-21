import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuantitySelector } from "./quantity-selector";

describe("QuantitySelector", () => {
  afterEach(() => cleanup());

  it("increment click -> calls onChange with value + 1", async () => {
    // Arrange
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantitySelector value={2} max={5} onChange={onChange} />);

    // Act
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]!);

    // Assert
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("decrement at min -> button disabled and onChange not called", async () => {
    // Arrange
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantitySelector value={1} min={1} max={5} onChange={onChange} />);
    const buttons = screen.getAllByRole("button");

    // Act
    await user.click(buttons[0]!);

    // Assert
    expect(buttons[0]).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("increment at max -> button disabled and onChange not called", async () => {
    // Arrange
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantitySelector value={5} max={5} onChange={onChange} />);
    const buttons = screen.getAllByRole("button");

    // Act
    await user.click(buttons[1]!);

    // Assert
    expect(buttons[1]).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("value and max displayed -> shows current value and max label", () => {
    // Arrange / Act
    render(<QuantitySelector value={3} max={8} onChange={() => {}} />);

    // Assert
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("max 8")).toBeInTheDocument();
  });
});
