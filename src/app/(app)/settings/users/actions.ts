"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { companyMembership, twoFactor, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { isRole, wouldRemoveLastOwner, ROLES } from "@/lib/permissions";
import { requireCompany, requireSystemAdmin } from "@/lib/session";
import { createUserWithPassword, generateTemporaryPassword, resetPasswordTo } from "@/lib/users";

export type MemberFormState = { error?: string; message?: string; temporaryPassword?: string };

const addSchema = z.object({
  email: z.email("Enter a valid email address.").transform((v) => v.trim().toLowerCase()),
  name: z.string().trim().max(120),
  role: z.enum(ROLES),
});

export async function addMember(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  const { user: actor, companyId } = await requireCompany("users.manage");
  const parsed = addSchema.safeParse({ email: form.get("email"), name: form.get("name") ?? "", role: form.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, name, role } = parsed.data;

  let target = await db.query.user.findFirst({ where: eq(user.email, email) });
  let temporaryPassword: string | undefined;
  if (!target) {
    if (!name) return { error: "This person doesn't have an account yet. Enter their name to create one." };
    temporaryPassword = generateTemporaryPassword();
    const created = await createUserWithPassword({ name, email, password: temporaryPassword, mustChangePassword: true });
    await writeAudit({ action: "user.created", entityType: "user", entityId: created.id, companyId, userId: actor.id, userEmail: actor.email, after: { email, name } });
    target = await db.query.user.findFirst({ where: eq(user.id, created.id) });
  }
  if (!target) return { error: "Could not create the account." };

  const inserted = await db
    .insert(companyMembership)
    .values({ companyId, userId: target.id, role })
    .onConflictDoNothing()
    .returning({ id: companyMembership.id });
  if (inserted.length === 0) return { error: `${email} already has access to this company.` };
  await writeAudit({ action: "membership.added", entityType: "membership", entityId: target.id, companyId, userId: actor.id, userEmail: actor.email, after: { email, role } });

  revalidatePath("/settings/users");
  return temporaryPassword
    ? { message: `Account created for ${email}. Give them this temporary password; they must change it and set up 2FA when they first sign in.`, temporaryPassword }
    : { message: `${email} now has access to this company.` };
}

async function loadMembers(companyId: string) {
  return db.select({ userId: companyMembership.userId, role: companyMembership.role }).from(companyMembership).where(eq(companyMembership.companyId, companyId));
}

export async function changeRole(form: FormData) {
  const { user: actor, companyId } = await requireCompany("users.manage");
  const userId = String(form.get("userId"));
  const role = form.get("role");
  if (!isRole(role)) return;
  const members = await loadMembers(companyId);
  const current = members.find((m) => m.userId === userId);
  if (!current || current.role === role || wouldRemoveLastOwner(members, userId, role)) return;
  await db.update(companyMembership).set({ role }).where(and(eq(companyMembership.companyId, companyId), eq(companyMembership.userId, userId)));
  await writeAudit({ action: "membership.role_changed", entityType: "membership", entityId: userId, companyId, userId: actor.id, userEmail: actor.email, before: { role: current.role }, after: { role } });
  revalidatePath("/settings/users");
}

export async function removeMember(form: FormData) {
  const { user: actor, companyId } = await requireCompany("users.manage");
  const userId = String(form.get("userId"));
  const members = await loadMembers(companyId);
  const current = members.find((m) => m.userId === userId);
  if (!current || wouldRemoveLastOwner(members, userId, null)) return;
  await db.delete(companyMembership).where(and(eq(companyMembership.companyId, companyId), eq(companyMembership.userId, userId)));
  await writeAudit({ action: "membership.removed", entityType: "membership", entityId: userId, companyId, userId: actor.id, userEmail: actor.email, before: { role: current.role } });
  revalidatePath("/settings/users");
}

// Account-wide actions (affect every company the person can access): system administrators only.

export async function adminResetPassword(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  const admin = await requireSystemAdmin();
  const userId = String(form.get("userId"));
  const target = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!target) return { error: "User not found." };
  const temporaryPassword = generateTemporaryPassword();
  await resetPasswordTo(userId, temporaryPassword);
  await writeAudit({ action: "user.password_reset", entityType: "user", entityId: userId, userId: admin.id, userEmail: admin.email });
  return { message: `Temporary password for ${target.email}. They'll be asked to change it at sign-in.`, temporaryPassword };
}

export async function adminSetUserActive(form: FormData) {
  const admin = await requireSystemAdmin();
  const userId = String(form.get("userId"));
  const isActive = form.get("isActive") === "true";
  if (userId === admin.id) return;
  await db.update(user).set({ isActive, updatedAt: new Date() }).where(eq(user.id, userId));
  if (!isActive) {
    await (await auth.$context).internalAdapter.deleteUserSessions(userId);
  }
  await writeAudit({ action: isActive ? "user.reactivated" : "user.deactivated", entityType: "user", entityId: userId, userId: admin.id, userEmail: admin.email });
  revalidatePath("/settings/users");
}

/** For a lost phone: removes the authenticator so the person sets it up again at next sign-in. */
export async function adminResetTwoFactor(form: FormData) {
  const admin = await requireSystemAdmin();
  const userId = String(form.get("userId"));
  if (userId === admin.id) return;
  await db.transaction(async (tx) => {
    await tx.delete(twoFactor).where(eq(twoFactor.userId, userId));
    await tx.update(user).set({ twoFactorEnabled: false, updatedAt: new Date() }).where(eq(user.id, userId));
    await writeAudit({ action: "user.2fa_reset", entityType: "user", entityId: userId, userId: admin.id, userEmail: admin.email }, tx);
  });
  await (await auth.$context).internalAdapter.deleteUserSessions(userId);
  revalidatePath("/settings/users");
}
