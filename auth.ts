import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authenticateCredentials } from "@/features/auth/services/credentials.service";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import type { UserRole } from "@/lib/db/schema";

import { authConfig } from "./auth.config";

async function findUserByEmailForCredentials(email: string) {
  const user = await db.query.users.findFirst({
    where: and(
      eq(schema.users.email, email),
      eq(schema.users.storeId, getStoreId()),
    ),
  });
  return user ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    // @ts-expect-error — custom PK schema; adapter works at runtime
    accountsTable: schema.accounts,
    // @ts-expect-error — custom PK schema; adapter works at runtime
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        return authenticateCredentials(credentials ?? {}, {
          findUserByEmail: findUserByEmailForCredentials,
          comparePassword: bcrypt.compare,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (token.id) {
        const dbUser = await db.query.users.findFirst({
          where: and(eq(schema.users.id, token.id as string), eq(schema.users.storeId, getStoreId())),
        });
        if (!dbUser || !dbUser.isActive) {
          throw new Error("User is deactivated");
        }
        token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      return session;
    },
  },
});
