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
      const passwordInput = screen.getByLabelText("Contraseña");
      const roleSelect = screen.getByLabelText("Rol");

      // Assert
      expect(passwordInput).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Administrador" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Empleado" })).toBeInTheDocument();
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
      const nameInput = screen.getByLabelText("Nombre completo");
      const emailInput = screen.getByLabelText("Correo electrónico");
      const activeCheckbox = screen.getByLabelText(
        "Activo (puede iniciar sesión en el panel administrador)",
      );

      // Assert
      expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
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
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      // Assert
      expect(routerBack).toHaveBeenCalledTimes(1);
    });
  });
});
