"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function VerifyForm() {
  const router = useRouter();
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    if (error) {
      setPending(false);
      setError(
        error.status === 401 && /expired|invalid two factor cookie/i.test(error.message ?? "")
          ? "Your sign-in timed out. Go back and sign in again."
          : "That code didn't work. Check it and try again.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="text-lg font-semibold">Two-factor verification</h1>
        <p className="text-sm text-slate-600">
          {useBackup ? "Enter one of your saved backup codes." : "Enter the 6-digit code from your authenticator app."}
        </p>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label={useBackup ? "Backup code" : "Authentication code"} htmlFor="code">
          <Input
            key={useBackup ? "backup" : "totp"}
            id="code"
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={useBackup ? "text" : "numeric"}
            pattern={useBackup ? undefined : "[0-9 ]{6,7}"}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Verifying…" : "Verify"}
        </Button>
        <div className="flex justify-between text-sm">
          <button type="button" className="text-brand-600 hover:underline" onClick={() => setUseBackup(!useBackup)}>
            {useBackup ? "Use authenticator app" : "Use a backup code"}
          </button>
          <a href="/login" className="text-slate-500 hover:underline">
            Start over
          </a>
        </div>
      </form>
    </Card>
  );
}
