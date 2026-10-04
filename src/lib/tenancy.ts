// Company isolation. Every company-owned record must be read and written through
// the company returned here, never through an id taken directly from the request.
import { and, asc, eq } from "drizzle-orm";
import { db, type Db } from "@/db";
import { company, companyMembership } from "@/db/schema";
import type { Role } from "@/lib/permissions";

export type Membership = {
  companyId: string;
  companyName: string;
  companyIsActive: boolean;
  role: Role;
};

export async function listMemberships(userId: string, conn: Db = db): Promise<Membership[]> {
  return conn
    .select({
      companyId: company.id,
      companyName: company.name,
      companyIsActive: company.isActive,
      role: companyMembership.role,
    })
    .from(companyMembership)
    .innerJoin(company, eq(company.id, companyMembership.companyId))
    .where(eq(companyMembership.userId, userId))
    .orderBy(asc(company.name));
}

/** The user's role in a company, or null when they are not a member. */
export async function getRole(userId: string, companyId: string, conn: Db = db): Promise<Role | null> {
  if (!isUuid(companyId)) return null;
  const [row] = await conn
    .select({ role: companyMembership.role })
    .from(companyMembership)
    .where(and(eq(companyMembership.userId, userId), eq(companyMembership.companyId, companyId)))
    .limit(1);
  return row?.role ?? null;
}

/**
 * Picks the company to work in: the requested one if the user belongs to it,
 * otherwise their first active company. Never returns a company they don't belong to.
 */
export function chooseActiveCompany(memberships: Membership[], requestedId: string | undefined): Membership | null {
  const requested = memberships.find((m) => m.companyId === requestedId);
  if (requested) return requested;
  return memberships.find((m) => m.companyIsActive) ?? memberships[0] ?? null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
