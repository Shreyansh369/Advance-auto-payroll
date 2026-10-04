import type { Metadata } from "next";
import { CompanyForm } from "@/components/company-form";
import { PageHeader } from "@/components/ui";
import { requireSystemAdmin } from "@/lib/session";
import { createCompany } from "../actions";

export const metadata: Metadata = { title: "Add company" };

export default async function NewCompanyPage() {
  await requireSystemAdmin();
  return (
    <>
      <PageHeader title="Add company" description="You'll be the owner of the new company and can add other users afterwards." />
      <CompanyForm action={createCompany} submitLabel="Create company" />
    </>
  );
}
