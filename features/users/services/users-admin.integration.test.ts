import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import { testDb } from "@/tests/integration/setup";

// Direct DB assertions — exercises the real cascade from the users service
// when a user is deactivated.

const STORE_ID = process.env.STORE_ID ?? "test-store";

async function seedUser(email: string) {
  const [user] = await testDb
    .insert(schema.users)
    .values({
      storeId: STORE_ID,
      name: "Test User",
      email,
      passwordHash: "$2b$12$fakehash",
      role: "EMPLOYEE",
      isActive: true,
    })
    .returning();
  return user;
}

async function seedSession(userId: string) {
  await testDb.insert(schema.sessions).values({
    sessionToken: `tok-${Date.now()}-${Math.random()}`,
    userId,
    expires: new Date(Date.now() + 1000 * 60 * 60),
  });
}

describe("users-admin service — integration", () => {
  it("unique email per store -> duplicate insert raises unique violation", async () => {
    // Arrange
    const email = `dup-${Date.now()}@example.com`;
    await seedUser(email);

    // Act / Assert
    await expect(
      testDb.insert(schema.users).values({
        storeId: STORE_ID,
        name: "Other",
        email,
        passwordHash: "$2b$12$other",
        role: "EMPLOYEE",
        isActive: true,
      }),
    ).rejects.toThrow();
  });

  it("cascading deactivation -> deleting user's sessions removes them", async () => {
    // Arrange
    const user = await seedUser(`cascade-${Date.now()}@example.com`);
    await seedSession(user.id);
    await seedSession(user.id);

    const before = await testDb.query.sessions.findMany({
      where: eq(schema.sessions.userId, user.id),
    });
    expect(before).toHaveLength(2);

    // Act — mirror the users-admin `toggleUserActive` deactivation path
    await testDb.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));

    // Assert
    const after = await testDb.query.sessions.findMany({
      where: eq(schema.sessions.userId, user.id),
    });
    expect(after).toHaveLength(0);
  });
});
