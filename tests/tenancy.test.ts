import { describe, expect, it } from "vitest";
import { chooseActiveCompany, isUuid, type Membership } from "@/lib/tenancy";

const m = (companyId: string, companyIsActive = true): Membership => ({ companyId, companyName: companyId, companyIsActive, role: "viewer" });

describe("chooseActiveCompany", () => {
  it("uses the requested company when the user belongs to it", () => {
    expect(chooseActiveCompany([m("a"), m("b")], "b")?.companyId).toBe("b");
  });

  it("never returns a company the user doesn't belong to", () => {
    expect(chooseActiveCompany([m("a"), m("b")], "someone-elses")?.companyId).toBe("a");
    expect(chooseActiveCompany([], "someone-elses")).toBeNull();
  });

  it("prefers an active company by default", () => {
    expect(chooseActiveCompany([m("a", false), m("b")], undefined)?.companyId).toBe("b");
    expect(chooseActiveCompany([m("a", false)], undefined)?.companyId).toBe("a");
  });
});

describe("isUuid", () => {
  it("rejects anything that isn't a UUID", () => {
    expect(isUuid("3f1c2a9e-8b7d-4c6e-9f00-1234567890ab")).toBe(true);
    expect(isUuid("1 OR 1=1")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});
