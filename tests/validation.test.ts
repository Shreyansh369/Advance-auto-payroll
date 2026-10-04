import { describe, expect, it } from "vitest";
import { diff } from "@/lib/audit";
import { companySchema } from "@/lib/validation/company";

describe("companySchema", () => {
  const base = {
    name: " Acme Ltd ",
    legalName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "British Virgin Islands",
    phone: "",
    email: "",
    socialSecurityEmployerNo: "",
    nhiEmployerNo: "",
    payrollTaxNo: "",
    payrollTaxClass: "class1",
    fiscalYearStartMonth: "1",
  };

  it("trims text and stores blanks as empty", () => {
    const parsed = companySchema.parse(base);
    expect(parsed.name).toBe("Acme Ltd");
    expect(parsed.legalName).toBeNull();
    expect(parsed.email).toBeNull();
    expect(parsed.fiscalYearStartMonth).toBe(1);
  });

  it("rejects a missing name, bad email, unknown tax class and bad month", () => {
    expect(companySchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(companySchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
    expect(companySchema.safeParse({ ...base, payrollTaxClass: "class3" }).success).toBe(false);
    expect(companySchema.safeParse({ ...base, fiscalYearStartMonth: "13" }).success).toBe(false);
  });
});

describe("audit diff", () => {
  it("records only the fields that changed", () => {
    const result = diff({ name: "A", city: null, phone: "1" }, { name: "B", city: null, phone: "1" });
    expect(result).toEqual({ before: { name: "A" }, after: { name: "B" }, changed: true });
  });

  it("treats undefined and null as the same", () => {
    expect(diff({ city: null }, { city: undefined }).changed).toBe(false);
  });
});
