import { db, type Db } from "@/db";
import { auditLog } from "@/db/schema";

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  companyId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
};

type Executor = Pick<Db, "insert">;

/** Appends one audit record. Pass a transaction as `tx` so the record commits with the change. */
export async function writeAudit(entry: AuditEntry, tx: Executor = db) {
  await tx.insert(auditLog).values({
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    companyId: entry.companyId ?? null,
    userId: entry.userId ?? null,
    userEmail: entry.userEmail ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
    ipAddress: entry.ipAddress ?? null,
  });
}

/** Returns only the fields whose values differ, so audit records show exactly what changed. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changedBefore[key] = a;
      changedAfter[key] = b;
    }
  }
  return { before: changedBefore, after: changedAfter, changed: Object.keys(changedAfter).length > 0 };
}
