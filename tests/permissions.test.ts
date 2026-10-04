import { describe, expect, it } from "vitest";
import { can, isRole, PERMISSIONS, wouldRemoveLastOwner } from "@/lib/permissions";

describe("can", () => {
  it("gives owners every permission", () => {
    for (const p of PERMISSIONS) expect(can("owner", p)).toBe(true);
  });

  it("keeps viewers read-only", () => {
    expect(can("viewer", "payroll.view")).toBe(true);
    expect(can("viewer", "reports.view")).toBe(true);
    expect(can("viewer", "employees.edit")).toBe(false);
    expect(can("viewer", "payroll.prepare")).toBe(false);
    expect(can("viewer", "audit.view")).toBe(false);
  });

  it("lets processors prepare but not approve payroll", () => {
    expect(can("processor", "payroll.prepare")).toBe(true);
    expect(can("processor", "payroll.approve")).toBe(false);
    expect(can("processor", "leave.adjust")).toBe(false);
  });

  it("reserves unlocking, settings and users for owners", () => {
    for (const role of ["approver", "processor", "viewer"] as const) {
      expect(can(role, "payroll.unlock")).toBe(false);
      expect(can(role, "company.edit")).toBe(false);
      expect(can(role, "users.manage")).toBe(false);
      expect(can(role, "settings.statutory")).toBe(false);
    }
  });

  it("denies when there is no role", () => {
    expect(can(null, "company.view")).toBe(false);
    expect(can(undefined, "company.view")).toBe(false);
  });
});

describe("isRole", () => {
  it("accepts only known roles", () => {
    expect(isRole("approver")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});

describe("wouldRemoveLastOwner", () => {
  const oneOwner = [
    { userId: "a", role: "owner" as const },
    { userId: "b", role: "processor" as const },
  ];
  const twoOwners = [...oneOwner, { userId: "c", role: "owner" as const }];

  it("blocks demoting or removing the only owner", () => {
    expect(wouldRemoveLastOwner(oneOwner, "a", "viewer")).toBe(true);
    expect(wouldRemoveLastOwner(oneOwner, "a", null)).toBe(true);
  });

  it("allows it when another owner remains", () => {
    expect(wouldRemoveLastOwner(twoOwners, "a", null)).toBe(false);
  });

  it("ignores non-owners and no-op changes", () => {
    expect(wouldRemoveLastOwner(oneOwner, "b", null)).toBe(false);
    expect(wouldRemoveLastOwner(oneOwner, "a", "owner")).toBe(false);
    expect(wouldRemoveLastOwner(oneOwner, "missing", null)).toBe(false);
  });
});
