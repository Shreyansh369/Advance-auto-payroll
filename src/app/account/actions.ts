"use server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { MIN_PASSWORD_LENGTH } from "@/lib/users";

export type FormState = { error?: string; ok?: boolean };

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const current = await requireUser({ allowIncompleteSetup: true });
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (newPassword !== confirm) return { error: "The new passwords don't match." };
  if (newPassword === currentPassword) return { error: "Choose a password different from the current one." };
  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (err) {
    if (isAPIError(err)) return { error: "The current password is incorrect." };
    throw err;
  }
  await db.update(user).set({ mustChangePassword: false, updatedAt: new Date() }).where(eq(user.id, current.id));
  await writeAudit({ action: "auth.password_changed", entityType: "user", entityId: current.id, userId: current.id, userEmail: current.email });
  return { ok: true };
}

/** Called after the authenticator app is verified, purely to record the event. */
export async function recordTwoFactorEnabled() {
  const current = await requireUser({ allowIncompleteSetup: true });
  if (!current.twoFactorEnabled) return;
  await writeAudit({ action: "auth.2fa_enabled", entityType: "user", entityId: current.id, userId: current.id, userEmail: current.email });
}
