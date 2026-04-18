import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: routerBack,
  }),
}));

import { UserForm } from "./user-form";

describe("UserForm", () => {
  const action = vi.fn(async () => ({}));

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    cleanup();
    routerBack.mockReset();
  });

  describe("✅ Happy path", () => {
    it("create form renders password field and assignable roles", () => {
      // Arrange
      render(
        <UserForm
          action={action}
          assignableRoles={["ADMIN", "EMPLOYEE"]}
        />,
      );

      // Act
      const passwordInput = screen.getByLabelText("Password");
      const roleSelect = screen.getByLabelText("Role");

      // Assert
      expect(passwordInput).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "ADMIN" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "EMPLOYEE" })).toBeInTheDocument();
      expect(roleSelect).toHaveValue("EMPLOYEE");
    });

    it("edit form hides password and prefills user fields", () => {
      // Arrange
      render(
        <UserForm
          action={action}
          assignableRoles={["EMPLOYEE"]}
          user={{
            id: "user-1",
            name: "Jane Doe",
            email: "jane@example.com",
            role: "EMPLOYEE",
            isActive: true,
          }}
        />,
      );

      // Act
      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email");
      const activeCheckbox = screen.getByLabelText(
        "Active (can sign in to admin panel)",
      );

      // Assert
      expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
      expect(nameInput).toHaveValue("Jane Doe");
      expect(emailInput).toHaveValue("jane@example.com");
      expect(activeCheckbox).toBeChecked();
    });
  });

  describe("🧭 Navigation", () => {
    it("Cancel click -> calls router.back", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <UserForm
          action={action}
          assignableRoles={["EMPLOYEE"]}
        />,
      );

      // Act
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Assert
      expect(routerBack).toHaveBeenCalledTimes(1);
    });
  });
});
