"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordForm } from "@/components/password-form";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { recordTwoFactorEnabled } from "../actions";

export function SetupWizard({ needsPassword }: { needsPassword: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "2fa">(needsPassword ? "password" : "2fa");
  return step === "password" ? (
    <PasswordForm title="Step 1 · Choose a new password" onDone={() => setStep("2fa")} />
  ) : (
    <TwoFactorSetup
      title={needsPassword ? "Step 2 · Two-factor authentication" : "Two-factor authentication"}
      onDone={async () => {
        await recordTwoFactorEnabled();
        router.replace("/");
        router.refresh();
      }}
    />
  );
}
