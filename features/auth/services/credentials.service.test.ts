import { describe, expect, it, vi } from "vitest";

import {
  authenticateCredentials,
  type CredentialsDeps,
  type CredentialsUserRecord,
} from "./credentials.service";

function buildUser(
  partial: Partial<CredentialsUserRecord> = {},
): CredentialsUserRecord {
  return {
    id: "user-1",
    name: "Jane",
    email: "jane@example.com",
    role: "ADMIN",
    passwordHash: "$2b$12$hashed",
    isActive: true,
    ...partial,
  };
}

describe("authenticateCredentials", () => {
  it("missing email -> returns null", async () => {
    // Arrange
    const deps: CredentialsDeps = {
      findUserByEmail: vi.fn(),
      comparePassword: vi.fn(),
    };

    // Act
    const result = await authenticateCredentials(
      { password: "secret" },
      deps,
    );

    // Assert
    expect(result).toBeNull();
    expect(deps.findUserByEmail).not.toHaveBeenCalled();
  });

  it("empty password string -> returns null", async () => {
    // Arrange
    const deps: CredentialsDeps = {
      findUserByEmail: vi.fn(),
      comparePassword: vi.fn(),
    };

    // Act
    const result = await authenticateCredentials(
      { email: "jane@example.com", password: "" },
      deps,
    );

    // Assert
    expect(result).toBeNull();
    expect(deps.findUserByEmail).not.toHaveBeenCalled();
  });

  it("user not found -> returns null", async () => {
    // Arrange
    const deps: CredentialsDeps = {
      findUserByEmail: vi.fn(async () => null),
      comparePassword: vi.fn(),
    };

    // Act
    const result = await authenticateCredentials(
      { email: "unknown@example.com", password: "x" },
      deps,
    );

    // Assert
    expect(result).toBeNull();
    expect(deps.comparePassword).not.toHaveBeenCalled();
  });

  it("user inactive -> returns null", async () => {
    // Arrange
    const deps: CredentialsDeps = {
      findUserByEmail: vi.fn(async () => buildUser({ isActive: false })),
      comparePassword: vi.fn(),
    };

    // Act
    const result = await authenticateCredentials(
      { email: "jane@example.com", password: "x" },
      deps,
    );

    // Assert
    expect(result).toBeNull();
    expect(deps.comparePassword).not.toHaveBeenCalled();
  });

  it("user without passwordHash -> returns null", async () => {
    // Arrange
    const deps: CredentialsDeps = {
      findUserByEmail: vi.fn(async () => buildUser({ passwordHash: null })),
      comparePassword: vi.fn(),
    };

    // Act
    const result = await authenticateCredentials(
      { email: "jane@example.com", password: "x" },
      deps,
    );

    // Assert
    expect(result).toBeNull();
  });

  it("wrong password -> returns null", async () => {
    // Arrange
    const deps: CredentialsDeps = {
      findUserByEmail: vi.fn(async () => buildUser()),
      comparePassword: vi.fn(async () => false),
    };

    // Act
    const result = await authenticateCredentials(
      { email: "jane@example.com", password: "wrong" },
      deps,
    );

    // Assert
    expect(result).toBeNull();
    expect(deps.comparePassword).toHaveBeenCalledWith("wrong", "$2b$12$hashed");
  });

  it("valid credentials -> returns authenticated user shape", async () => {
    // Arrange
    const deps: CredentialsDeps = {
      findUserByEmail: vi.fn(async () => buildUser()),
      comparePassword: vi.fn(async () => true),
    };

    // Act
    const result = await authenticateCredentials(
      { email: "jane@example.com", password: "right" },
      deps,
    );

    // Assert
    expect(result).toEqual({
      id: "user-1",
      name: "Jane",
      email: "jane@example.com",
      role: "ADMIN",
    });
  });
});
