"use client";
import { useRef } from "react";
import { switchCompany } from "@/app/(app)/actions";
import type { Membership } from "@/lib/tenancy";

export function CompanySwitcher({ memberships, activeId }: { memberships: Membership[]; activeId: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  if (memberships.length === 0) return null;
  return (
    <form ref={formRef} action={switchCompany} className="min-w-0">
      <label htmlFor="companyId" className="sr-only">
        Active company
      </label>
      <select
        id="companyId"
        name="companyId"
        defaultValue={activeId ?? undefined}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full max-w-xs truncate rounded-md border border-slate-300 bg-white py-1.5 pl-2 pr-8 text-sm font-medium"
      >
        {memberships.map((m) => (
          <option key={m.companyId} value={m.companyId}>
            {m.companyName}
            {m.companyIsActive ? "" : " (inactive)"}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="ml-2 text-sm underline">
          Switch
        </button>
      </noscript>
    </form>
  );
}
