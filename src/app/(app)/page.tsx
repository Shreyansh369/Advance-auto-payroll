import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, company } from "@/db/schema";
import { Badge, Card, PageHeader } from "@/components/ui";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { requireCompany } from "@/lib/session";
import { PAYROLL_TAX_CLASS_LABELS } from "@/lib/validation/company";

export default async function DashboardPage() {
  const { companyId, role } = await requireCompany();
  const [c] = await db.select().from(company).where(eq(company.id, companyId));
  const recent = can(role, "audit.view")
    ? await db.select().from(auditLog).where(eq(auditLog.companyId, companyId)).orderBy(desc(auditLog.id)).limit(5)
    : [];

  const checklist = [
    { done: !!c.legalName, label: "Legal name" },
    { done: !!c.socialSecurityEmployerNo, label: "Social Security employer number" },
    { done: !!c.nhiEmployerNo, label: "NHI employer number" },
    { done: !!c.payrollTaxNo, label: "Payroll Tax number" },
  ];
  const missing = checklist.filter((i) => !i.done);

  return (
    <>
      <PageHeader title={c.name} description={c.legalName ?? undefined} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Company</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Your role</dt>
            <dd>{ROLE_LABELS[role]}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd>{c.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}</dd>
            <dt className="text-slate-500">Payroll Tax class</dt>
            <dd>{PAYROLL_TAX_CLASS_LABELS[c.payrollTaxClass]}</dd>
            <dt className="text-slate-500">Currency</dt>
            <dd>{c.currency}</dd>
          </dl>
        </Card>
        <Card>
          <h2 className="font-semibold">Setup checklist</h2>
          {missing.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">All company registration details are filled in.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-1 text-sm">
                {checklist.map((i) => (
                  <li key={i.label} className={i.done ? "text-slate-400 line-through" : ""}>
                    {i.done ? "✓" : "○"} {i.label}
                  </li>
                ))}
              </ul>
              {can(role, "company.edit") && (
                <Link href="/settings/company" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
                  Complete company settings →
                </Link>
              )}
            </>
          )}
        </Card>
        {recent.length > 0 && (
          <Card className="md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent activity</h2>
              <Link href="/audit" className="text-sm text-brand-600 hover:underline">
                Full audit log
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-col py-2 sm:flex-row sm:justify-between">
                  <span>
                    {r.action} <span className="text-slate-500">by {r.userEmail ?? "system"}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {r.occurredAt.toLocaleString("en-US", { timeZone: "America/Tortola", dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
