"use client";
import { useActionState, useEffect } from "react";
import { changePassword, type FormState } from "@/app/account/actions";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function PasswordForm({ title, onDone }: { title: string; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state.ok, onDone]);

  return (
    <Card>
      <form action={action} className="space-y-4">
        <h2 className="font-semibold">{title}</h2>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.ok && !onDone && <Alert tone="success">Password changed. Other devices have been signed out.</Alert>}
        <Field label="Current password" htmlFor="currentPassword">
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password" htmlFor="newPassword" hint="At least 12 characters. A short sentence works well.">
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={12} required />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword">
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </Button>
      </form>
    </Card>
  );
}
