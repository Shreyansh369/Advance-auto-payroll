"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { company, companyMembership } from "@/db/schema";
import type { CompanyFormState } from "@/components/company-form";
import { writeAudit } from "@/lib/audit";
import { requireSystemAdmin, setActiveCompanyCookie } from "@/lib/session";
import { companyFromForm } from "@/lib/validation/company";
import { fieldErrors } from "@/lib/validation/errors";

export async function createCompany(_prev: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const admin = await requireSystemAdmin();
  const parsed = companyFromForm(form);
  if (!parsed.success) return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const companyId = await db.transaction(async (tx) => {
    const [created] = await tx.insert(company).values(parsed.data).returning();
    await tx.insert(companyMembership).values({ companyId: created.id, userId: admin.id, role: "owner" });
    await writeAudit(
      { action: "company.created", entityType: "company", entityId: created.id, companyId: created.id, userId: admin.id, userEmail: admin.email, after: parsed.data },
      tx,
    );
    return created.id;
  });

  await setActiveCompanyCookie(companyId);
  redirect("/settings/company");
}

export async function setCompanyActive(form: FormData) {
  const admin = await requireSystemAdmin();
  const companyId = String(form.get("companyId"));
  const isActive = form.get("isActive") === "true";
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(company).set({ isActive, updatedAt: new Date() }).where(eq(company.id, companyId)).returning({ id: company.id });
    if (!updated) return;
    await writeAudit(
      { action: isActive ? "company.reactivated" : "company.deactivated", entityType: "company", entityId: companyId, companyId, userId: admin.id, userEmail: admin.email },
      tx,
    );
  });
  revalidatePath("/companies");
}
