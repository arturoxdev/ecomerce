import "server-only";

import { auditLog } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

type AuditEntry = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function recordAudit(entry: AuditEntry, tx?: Tx): Promise<void> {
  const client = tx ?? db;
  try {
    await client.insert(auditLog).values({
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: (entry.before ?? null) as never,
      after: (entry.after ?? null) as never,
    });
  } catch (err) {
    logger.warn("audit.write_failed", {
      action: entry.action,
      entity: entry.entity,
    });
  }
}
