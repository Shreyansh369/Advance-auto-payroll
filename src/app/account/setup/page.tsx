import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { SetupWizard } from "./setup-wizard";

export const metadata: Metadata = { title: "Secure your account" };

export default async function SetupPage() {
  const user = await requireUser({ allowIncompleteSetup: true });
  if (!user.mustChangePassword && user.twoFactorEnabled) redirect("/");
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold">Secure your account</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">
        Before using the payroll system, {user.mustChangePassword ? "choose your own password and " : ""}set up
        two-factor authentication with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…).
      </p>
      <SetupWizard needsPassword={user.mustChangePassword} />
    </main>
  );
}
