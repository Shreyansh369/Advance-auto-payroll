import { z } from "zod";

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

export const companySchema = z.object({
  name: z.string().trim().min(1, "Enter a company name.").max(120),
  legalName: optionalText(),
  addressLine1: optionalText(),
  addressLine2: optionalText(),
  city: optionalText(100),
  country: z.string().trim().min(1).max(100).default("British Virgin Islands"),
  phone: optionalText(50),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address.")
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .nullable(),
  socialSecurityEmployerNo: optionalText(50),
  nhiEmployerNo: optionalText(50),
  payrollTaxNo: optionalText(50),
  payrollTaxClass: z.enum(["class1", "class2"]),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
});
export type CompanyInput = z.infer<typeof companySchema>;

export const COMPANY_FIELDS = Object.keys(companySchema.shape) as (keyof CompanyInput)[];

export function companyFromForm(form: FormData) {
  const raw: Record<string, string> = {};
  for (const key of COMPANY_FIELDS) raw[key] = String(form.get(key) ?? "");
  return companySchema.safeParse(raw);
}

export const PAYROLL_TAX_CLASS_LABELS = {
  class1: "Class 1 – small employer (employer share 2%)",
  class2: "Class 2 – other employers (employer share 6%)",
} as const;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
