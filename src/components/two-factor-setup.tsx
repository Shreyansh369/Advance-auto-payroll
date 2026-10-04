"use client";
import { useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

type Step = { name: "password" } | { name: "scan"; totpURI: string; qr: string; backupCodes: string[] } | { name: "codes"; backupCodes: string[] };

export function TwoFactorSetup({ title, onDone }: { title: string; onDone: () => void | Promise<void> }) {
  const [step, setStep] = useState<Step>({ name: "password" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const password = String(new FormData(e.currentTarget).get("password"));
    const { data, error } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (error || !data || data.method !== "totp") return setError("Incorrect password.");
    const qr = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 });
    setStep({ name: "scan", totpURI: data.totpURI, qr, backupCodes: data.backupCodes });
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step.name !== "scan") return;
    setError(null);
    setPending(true);
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) return setError("That code didn't match. Wait for a new code and try again.");
    setStep({ name: "codes", backupCodes: step.backupCodes });
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold">{title}</h2>
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {step.name === "password" && (
        <form onSubmit={start} className="space-y-4">
          <Field label="Confirm your password" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Preparing…" : "Continue"}
          </Button>
        </form>
      )}

      {step.name === "scan" && (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-slate-600">Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated in the browser */}
          <img src={step.qr} alt="Authenticator QR code" width={220} height={220} className="mx-auto rounded border" />
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer">Can&apos;t scan? Enter the key manually</summary>
            <code className="mt-2 block break-all rounded bg-slate-100 p-2">
              {new URL(step.totpURI).searchParams.get("secret")}
            </code>
          </details>
          <Field label="6-digit code" htmlFor="code">
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Turn on two-factor authentication"}
          </Button>
        </form>
      )}

      {step.name === "codes" && (
        <div className="space-y-4">
          <Alert tone="success">Two-factor authentication is on.</Alert>
          <p className="text-sm text-slate-700">
            Save these backup codes somewhere safe (a password manager or printed). Each one works once if you lose your
            phone. They won&apos;t be shown again.
          </p>
          <ul className="grid grid-cols-2 gap-2 rounded bg-slate-100 p-3 font-mono text-sm">
            {step.backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Button onClick={() => onDone()}>I&apos;ve saved my backup codes</Button>
        </div>
      )}
    </Card>
  );
}
