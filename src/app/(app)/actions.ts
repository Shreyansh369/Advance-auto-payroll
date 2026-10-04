"use server";
import { redirect } from "next/navigation";
import { requireUser, setActiveCompanyCookie } from "@/lib/session";
import { getRole } from "@/lib/tenancy";

export async function switchCompany(form: FormData) {
  const user = await requireUser();
  const companyId = String(form.get("companyId") ?? "");
  // Only remember companies the user actually belongs to.
  if (await getRole(user.id, companyId)) {
    await setActiveCompanyCookie(companyId);
  }
  redirect("/");
}
