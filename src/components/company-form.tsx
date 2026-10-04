"use client";
import { useActionState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { MONTHS, PAYROLL_TAX_CLASS_LABELS, type CompanyInput } from "@/lib/validation/company";

export type CompanyFormState = { error?: string; fieldErrors?: Partial<Record<keyof CompanyInput, string>>; ok?: boolean };
type Values = { [K in keyof CompanyInput]?: CompanyInput[K] | null };

export function CompanyForm({
  action,
  values: initialValues = {},
  readOnly = false,
  submitLabel,
}: {
  action: (state: CompanyFormState, form: FormData) => Promise<CompanyFormState>;
  values?: Values;
  readOnly?: boolean;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const values: Values = { country: "British Virgin Islands", ...initialValues };
  const err = state.fieldErrors ?? {};
  const text = (name: keyof CompanyInput, label: string, opts: { type?: string; hint?: string; required?: boolean } = {}) => (
    <Field label={label} htmlFor={name} hint={opts.hint} error={err[name]}>
      <Input
        id={name}
        name={name}
        type={opts.type ?? "text"}
        defaultValue={(values[name] as string | null | undefined) ?? ""}
        required={opts.required}
        disabled={readOnly}
      />
    </Field>
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Saved.</Alert>}
      <fieldset disabled={readOnly} className="contents">
        <Card>
          <h2 className="mb-4 font-semibold">Company</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("name", "Display name", { required: true, hint: "Shown in the company switcher." })}
            {text("legalName", "Legal name", { hint: "As registered; printed on payslips and reports." })}
            {text("addressLine1", "Address line 1")}
            {text("addressLine2", "Address line 2")}
            {text("city", "Town / island")}
            {text("country", "Country", { required: true })}
            {text("phone", "Phone", { type: "tel" })}
            {text("email", "Email", { type: "email" })}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">BVI registrations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("socialSecurityEmployerNo", "Social Security employer no.")}
            {text("nhiEmployerNo", "NHI employer no.")}
            {text("payrollTaxNo", "Payroll Tax no.")}
            <Field label="Payroll Tax employer class" htmlFor="payrollTaxClass" error={err.payrollTaxClass} hint="Class 1: 7 or fewer employees, payroll ≤ $150,000 and turnover ≤ $300,000. Confirm with your accountant.">
              <Select id="payrollTaxClass" name="payrollTaxClass" defaultValue={values.payrollTaxClass ?? "class2"}>
                {Object.entries(PAYROLL_TAX_CLASS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Financial year starts" htmlFor="fiscalYearStartMonth" error={err.fiscalYearStartMonth} hint="Used for year-to-date totals.">
              <Select id="fiscalYearStartMonth" name="fiscalYearStartMonth" defaultValue={String(values.fiscalYearStartMonth ?? 1)}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      </fieldset>
      {!readOnly && (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      )}
    </form>
  );
}
