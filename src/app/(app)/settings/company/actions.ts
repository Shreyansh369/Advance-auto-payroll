"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { company } from "@/db/schema";
import type { CompanyFormState } from "@/components/company-form";
import { diff, writeAudit } from "@/lib/audit";
import { requireCompany } from "@/lib/session";
import { companyFromForm, COMPANY_FIELDS } from "@/lib/validation/company";
import { fieldErrors } from "@/lib/validation/errors";

export async function updateCompany(_prev: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { user, companyId } = await requireCompany("company.edit");
  const parsed = companyFromForm(form);
  if (!parsed.success) return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(company).where(eq(company.id, companyId)).for("update");
    const picked = Object.fromEntries(COMPANY_FIELDS.map((k) => [k, current[k]]));
    const changes = diff(picked, parsed.data);
    if (!changes.changed) return;
    await tx.update(company).set({ ...parsed.data, updatedAt: new Date() }).where(eq(company.id, companyId));
    await writeAudit(
      { action: "company.updated", entityType: "company", entityId: companyId, companyId, userId: user.id, userEmail: user.email, before: changes.before, after: changes.after },
      tx,
    );
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
