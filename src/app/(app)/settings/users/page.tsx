import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { companyMembership, user } from "@/db/schema";
import { Badge, Button, Card, PageHeader, Select } from "@/components/ui";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from "@/lib/permissions";
import { requireCompany } from "@/lib/session";
import { adminResetTwoFactor, adminSetUserActive, changeRole, removeMember } from "./actions";
import { AddMemberForm, ResetPasswordForm } from "./forms";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const { user: me, companyId, companyName } = await requireCompany("users.manage");
  const members = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: companyMembership.role,
      twoFactorEnabled: user.twoFactorEnabled,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    })
    .from(companyMembership)
    .innerJoin(user, eq(user.id, companyMembership.userId))
    .where(eq(companyMembership.companyId, companyId))
    .orderBy(asc(user.name));
  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <>
      <PageHeader title="Users & roles" description={`Who can access ${companyName}, and what they can do.`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {members.map((m) => (
            <Card key={m.userId}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    {m.name} {m.userId === me.id && <span className="text-sm text-slate-500">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-slate-500">{m.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {!m.isActive && <Badge tone="red">Account disabled</Badge>}
                    {m.mustChangePassword && <Badge>Temporary password</Badge>}
                    {m.twoFactorEnabled ? <Badge tone="green">2FA on</Badge> : <Badge tone="red">2FA not set up</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={changeRole} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={m.userId} />
                    <label htmlFor={`role-${m.userId}`} className="sr-only">
                      Role
                    </label>
                    <Select id={`role-${m.userId}`} name="role" defaultValue={m.role} className="w-auto">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                    <Button variant="secondary" type="submit">
                      Save
                    </Button>
                  </form>
                  <form action={removeMember}>
                    <input type="hidden" name="userId" value={m.userId} />
                    <Button
                      variant="ghost"
                      type="submit"
                      className="text-red-600 disabled:text-slate-400"
                      disabled={m.role === "owner" && ownerCount === 1}
                      title={m.role === "owner" && ownerCount === 1 ? "Add another owner first" : undefined}
                    >
                      Remove
                    </Button>
                  </form>
                </div>
              </div>
              {me.isSystemAdmin && m.userId !== me.id && (
                <details className="mt-3 border-t border-slate-100 pt-3 text-sm">
                  <summary className="cursor-pointer text-slate-600">Account tools (administrator)</summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ResetPasswordForm userId={m.userId} />
                    <form action={adminResetTwoFactor}>
                      <input type="hidden" name="userId" value={m.userId} />
                      <Button variant="secondary" type="submit">
                        Reset 2FA (lost phone)
                      </Button>
                    </form>
                    <form action={adminSetUserActive}>
                      <input type="hidden" name="userId" value={m.userId} />
                      <input type="hidden" name="isActive" value={String(!m.isActive)} />
                      <Button variant={m.isActive ? "danger" : "secondary"} type="submit">
                        {m.isActive ? "Disable account" : "Enable account"}
                      </Button>
                    </form>
                  </div>
                </details>
              )}
            </Card>
          ))}
          <p className="text-xs text-slate-500">A company always keeps at least one owner. Removing someone here only removes their access to this company.</p>
        </div>
        <div className="space-y-4">
          <AddMemberForm />
          <Card>
            <h2 className="mb-2 font-semibold">Roles</h2>
            <dl className="space-y-2 text-sm">
              {ROLES.map((r) => (
                <div key={r}>
                  <dt className="font-medium">{ROLE_LABELS[r]}</dt>
                  <dd className="text-slate-600">{ROLE_DESCRIPTIONS[r]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
