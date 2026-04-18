import type { UserRole } from "@/lib/db/schema";

export type CredentialsInput = {
  email?: unknown;
  password?: unknown;
};

export type AuthenticatedUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
};

export type CredentialsUserRecord = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  passwordHash: string | null;
  isActive: boolean;
};

export type CredentialsDeps = {
  findUserByEmail: (email: string) => Promise<CredentialsUserRecord | null>;
  comparePassword: (plain: string, hash: string) => Promise<boolean>;
};

/**
 * Pure credentials authentication logic. Extracted from auth.ts so each
 * branch (missing fields, user not found, user inactive, bad password,
 * success) can be asserted without booting NextAuth.
 */
export async function authenticateCredentials(
  credentials: CredentialsInput,
  deps: CredentialsDeps,
): Promise<AuthenticatedUser | null> {
  const email = credentials?.email;
  const password = credentials?.password;

  if (typeof email !== "string" || typeof password !== "string") return null;
  if (!email || !password) return null;

  const user = await deps.findUserByEmail(email);
  if (!user) return null;
  if (!user.passwordHash) return null;
  if (!user.isActive) return null;

  const isValid = await deps.comparePassword(password, user.passwordHash);
  if (!isValid) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
