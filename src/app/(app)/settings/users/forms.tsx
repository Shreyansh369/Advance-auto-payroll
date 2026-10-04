"use client";
import { useActionState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";
import { addMember, adminResetPassword, type MemberFormState } from "./actions";

function TemporaryPassword({ value }: { value: string }) {
  return <code className="mt-2 block select-all break-all rounded bg-white px-2 py-1 font-mono text-base text-slate-900">{value}</code>;
}

export function AddMemberForm() {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(addMember, {});
  return (
    <Card>
      <form action={action} className="space-y-4">
        <h2 className="font-semibold">Give someone access</h2>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && (
          <Alert tone="success">
            {state.message}
            {state.temporaryPassword && <TemporaryPassword value={state.temporaryPassword} />}
          </Alert>
        )}
        <Field label="Email" htmlFor="member-email">
          <Input id="member-email" name="email" type="email" required />
        </Field>
        <Field label="Full name" htmlFor="member-name" hint="Needed only if they don't have an account yet.">
          <Input id="member-name" name="name" />
        </Field>
        <Field label="Role" htmlFor="member-role">
          <Select id="member-role" name="role" defaultValue="processor">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add user"}
        </Button>
      </form>
    </Card>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(adminResetPassword, {});
  return (
    <form action={action} className="w-full space-y-2 sm:w-auto">
      <input type="hidden" name="userId" value={userId} />
      <Button variant="secondary" type="submit" disabled={pending}>
        Reset password
      </Button>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && (
        <Alert tone="success">
          {state.message}
          {state.temporaryPassword && <TemporaryPassword value={state.temporaryPassword} />}
        </Alert>
      )}
    </form>
  );
}
