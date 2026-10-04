import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { company, companyMembership } from "@/db/schema";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireSystemAdmin } from "@/lib/session";
import { setCompanyActive } from "./actions";

export const metadata: Metadata = { title: "All companies" };

export default async function CompaniesPage() {
  await requireSystemAdmin();
  const rows = await db
    .select({ id: company.id, name: company.name, legalName: company.legalName, isActive: company.isActive, users: count(companyMembership.id) })
    .from(company)
    .leftJoin(companyMembership, eq(companyMembership.companyId, company.id))
    .groupBy(company.id)
    .orderBy(asc(company.name));

  return (
    <>
      <PageHeader
        title="All companies"
        description="Each company's employees and payroll are kept completely separate."
        actions={
          <Link href="/companies/new">
            <Button>Add company</Button>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <Card>No companies yet.</Card>
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-slate-200">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {c.name} {!c.isActive && <Badge tone="red">Inactive</Badge>}
                  </p>
                  <p className="text-sm text-slate-500">
                    {c.legalName ?? "—"} · {c.users} user{c.users === 1 ? "" : "s"}
                  </p>
                </div>
                <form action={setCompanyActive}>
                  <input type="hidden" name="companyId" value={c.id} />
                  <input type="hidden" name="isActive" value={String(!c.isActive)} />
                  <Button variant="secondary" type="submit">
                    {c.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Companies are never deleted, so their payroll history is always kept. Deactivated companies stay readable.
      </p>
    </>
  );
}
