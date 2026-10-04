import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { company } from "@/db/schema";
import { CompanyForm } from "@/components/company-form";
import { Alert, PageHeader } from "@/components/ui";
import { can } from "@/lib/permissions";
import { requireCompany } from "@/lib/session";
import { updateCompany } from "./actions";

export const metadata: Metadata = { title: "Company settings" };

export default async function CompanySettingsPage() {
  const { companyId, role } = await requireCompany("company.view");
  const [row] = await db.select().from(company).where(eq(company.id, companyId));
  const editable = can(role, "company.edit");
  return (
    <>
      <PageHeader title="Company settings" description={row.legalName ?? row.name} />
      {!editable && (
        <div className="mb-4">
          <Alert>Only the company owner can change these settings.</Alert>
        </div>
      )}
      <CompanyForm action={updateCompany} values={row} readOnly={!editable} submitLabel="Save changes" />
    </>
  );
}
