import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { Card, PageHeader } from "@/components/ui";
import { requireCompany } from "@/lib/session";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function Changes({ before, after }: { before: unknown; after: unknown }) {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  if (keys.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
      {keys.map((k) => (
        <li key={k} className="break-words">
          <span className="font-medium">{k}</span>: {k in b ? <span className="line-through">{formatValue(b[k])}</span> : null}
          {k in b && k in a ? " → " : null}
          {k in a ? <span>{formatValue(a[k])}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export default async function AuditPage(props: PageProps<"/audit">) {
  const { companyId, companyName } = await requireCompany("audit.view");
  const { before } = await props.searchParams;
  const cursor = typeof before === "string" && /^\d+$/.test(before) ? Number(before) : undefined;

  const rows = await db
    .select()
    .from(auditLog)
    .where(cursor ? and(eq(auditLog.companyId, companyId), lt(auditLog.id, cursor)) : eq(auditLog.companyId, companyId))
    .orderBy(desc(auditLog.id))
    .limit(PAGE_SIZE + 1);
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);

  return (
    <>
      <PageHeader title="Audit log" description={`Every change made in ${companyName}. Entries can't be edited or deleted.`} />
      <Card className="p-0 sm:p-0">
        {page.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {page.map((r) => (
              <li key={r.id} className="p-4 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                  <span className="font-medium">{r.action}</span>
                  <time className="text-xs text-slate-500" dateTime={r.occurredAt.toISOString()}>
                    {r.occurredAt.toLocaleString("en-US", { timeZone: "America/Tortola", dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
                <p className="text-xs text-slate-500">
                  {r.userEmail ?? "system"} · {r.entityType}
                  {r.reason ? ` · Reason: ${r.reason}` : ""}
                </p>
                <Changes before={r.before} after={r.after} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      {hasMore && (
        <div className="mt-4">
          <Link className="text-sm text-brand-600 hover:underline" href={`/audit?before=${page[page.length - 1].id}`}>
            Older entries →
          </Link>
        </div>
      )}
    </>
  );
}
