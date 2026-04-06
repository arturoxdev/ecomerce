import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import type { UserRole } from "@/lib/db/schema";

import { authConfig } from "./auth.config";

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
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: and(
            eq(schema.users.email, email),
            eq(schema.users.storeId, getStoreId()),
          ),
        });

        if (!user || !user.passwordHash) return null;
        if (!user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
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
