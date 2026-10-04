// Per-company roles and what each may do. Pure module: safe to import anywhere and unit-tested.

export const ROLES = ["owner", "approver", "processor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  approver: "Approver",
  processor: "Payroll processor",
  viewer: "Viewer / accountant",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Everything, including company settings, users and unlocking finalized payroll.",
  approver: "Review and approve payroll, authorize leave adjustments and corrections.",
  processor: "Enter employees, time, leave and payroll inputs; calculate payroll.",
  viewer: "Read-only access to employees, payroll history and reports.",
};

export const PERMISSIONS = [
  "company.view",
  "company.edit",
  "users.manage",
  "audit.view",
  "employees.view",
  "employees.edit",
  "leave.edit",
  "leave.adjust",
  "payroll.view",
  "payroll.prepare",
  "payroll.approve",
  "payroll.unlock",
  "reports.view",
  "settings.statutory",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const GRANTS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  approver: [
    "company.view",
    "audit.view",
    "employees.view",
    "employees.edit",
    "leave.edit",
    "leave.adjust",
    "payroll.view",
    "payroll.prepare",
    "payroll.approve",
    "reports.view",
  ],
  processor: ["company.view", "employees.view", "employees.edit", "leave.edit", "payroll.view", "payroll.prepare", "reports.view"],
  viewer: ["company.view", "employees.view", "payroll.view", "reports.view"],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && GRANTS[role].includes(permission);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** True if changing (or removing, when newRole is null) this member would leave the company without an owner. */
export function wouldRemoveLastOwner(members: { userId: string; role: Role }[], userId: string, newRole: Role | null): boolean {
  const target = members.find((m) => m.userId === userId);
  if (!target || target.role !== "owner" || newRole === "owner") return false;
  return members.filter((m) => m.role === "owner").length <= 1;
}
