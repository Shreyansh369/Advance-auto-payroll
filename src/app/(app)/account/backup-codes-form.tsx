"use client";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function BackupCodesForm() {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const password = String(new FormData(e.currentTarget).get("password"));
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
    setPending(false);
    if (error || !data) return setError("Incorrect password.");
    setCodes(data.backupCodes);
  }

  return (
    <Card>
      <h2 className="font-semibold">Backup codes</h2>
      {codes ? (
        <div className="mt-3 space-y-3">
          <Alert tone="success">New backup codes created. Your old codes no longer work.</Alert>
          <ul className="grid grid-cols-2 gap-2 rounded bg-slate-100 p-3 font-mono text-sm">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <p className="text-sm text-slate-600">Create a fresh set if you&apos;ve used or lost your codes. The old set stops working.</p>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Password" htmlFor="backup-password">
            <Input id="backup-password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Generating…" : "Generate new backup codes"}
          </Button>
        </form>
      )}
    </Card>
  );
}
