// Account creation is admin-only (public sign-up is disabled), so it goes through
// Better Auth's internal adapter to get the same password hashing as normal sign-in.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

export const MIN_PASSWORD_LENGTH = 12;

export async function createUserWithPassword(input: {
  name: string;
  email: string;
  password: string;
  isSystemAdmin?: boolean;
  mustChangePassword?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const ctx = await auth.$context;
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    throw new Error("A user with this email already exists.");
  }
  const created = await ctx.internalAdapter.createUser({
    name: input.name.trim(),
    email,
    emailVerified: true,
  }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({
    providerId: "credential",
    accountId: created.id,
    userId: created.id,
    password: await ctx.password.hash(input.password),
  });
  await db
    .update(user)
    .set({ isSystemAdmin: !!input.isSystemAdmin, mustChangePassword: input.mustChangePassword ?? true })
    .where(eq(user.id, created.id));
  return { id: created.id, email };
}

/** Admin-initiated reset: sets a temporary password, signs the user out everywhere. */
export async function resetPasswordTo(userId: string, temporaryPassword: string) {
  if (temporaryPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(temporaryPassword));
  await ctx.internalAdapter.deleteUserSessions(userId);
  await db.update(user).set({ mustChangePassword: true }).where(eq(user.id, userId));
}

export function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
