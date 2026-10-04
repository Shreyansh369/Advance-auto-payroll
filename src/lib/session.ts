import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";
import { chooseActiveCompany, listMemberships } from "@/lib/tenancy";

export const ACTIVE_COMPANY_COOKIE = "active_company";

export const getSession = cache(async () => {
  // Build the cookie header from cookies(), not headers(): inside a server action that
  // just replaced the session (e.g. password change), only cookies() has the new value.
  const requestHeaders = new Headers(await headers());
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  requestHeaders.set("cookie", cookieHeader);
  return auth.api.getSession({ headers: requestHeaders });
});

/**
 * Signed-in user who has finished account setup (permanent password + 2FA).
 * Pass `allowIncompleteSetup` only on the setup page itself.
 */
export async function requireUser(opts: { allowIncompleteSetup?: boolean } = {}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = session.user;
  if (!user.isActive) redirect("/login");
  if (!opts.allowIncompleteSetup && (user.mustChangePassword || !user.twoFactorEnabled)) {
    redirect("/account/setup");
  }
  return user;
}

export async function requireSystemAdmin() {
  const user = await requireUser();
  if (!user.isSystemAdmin) redirect("/denied");
  return user;
}

export const getCompanyContext = cache(async () => {
  const user = await requireUser();
  const memberships = await listMemberships(user.id);
  const requested = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const active = chooseActiveCompany(memberships, requested);
  return { user, memberships, active };
});

/** Active company + the user's role in it. Redirects when there is none or the permission is missing. */
export async function requireCompany(permission?: Permission) {
  const { user, memberships, active } = await getCompanyContext();
  if (!active) redirect(user.isSystemAdmin ? "/companies/new" : "/no-company");
  if (permission && !can(active.role, permission)) redirect("/denied");
  return { user, memberships, companyId: active.companyId, companyName: active.companyName, role: active.role };
}

/** Remembers the company to work in. Callers must have checked membership first. */
export async function setActiveCompanyCookie(companyId: string) {
  (await cookies()).set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
