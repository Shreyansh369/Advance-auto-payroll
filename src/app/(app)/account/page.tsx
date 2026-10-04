import type { Metadata } from "next";
import { PasswordForm } from "@/components/password-form";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { BackupCodesForm } from "./backup-codes-form";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="My account" description={`${user.name} · ${user.email}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PasswordForm title="Change password" />
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Two-factor authentication</h2>
            <p className="mt-1 text-sm text-slate-600">
              On. Two-factor authentication is required for everyone. If you lose your phone, sign in with a backup code
              or ask the administrator to reset it.
            </p>
          </Card>
          <BackupCodesForm />
        </div>
      </div>
    </>
  );
}
