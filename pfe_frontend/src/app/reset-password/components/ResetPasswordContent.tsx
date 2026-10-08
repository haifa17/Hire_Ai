"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { useResetPassword } from "../hooks/useResetPassword";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { ResultCard } from "@/components/auth/ResultCard";

export function ResetPasswordContent() {
  const t = useTranslations("auth.resetPassword");
  const token = useSearchParams().get("token") ?? "";
  const { status, error, isSubmitting, submit } = useResetPassword(token);

  if (status === "success") {
    return (
      <AuthShell className="py-12 text-center">
        <ResultCard
          tone="success"
          heading={t("successHeading")}
          message={t("successBody")}
        >
          <Link href="/login" className="w-full">
            <Button className="w-full">{t("signIn")}</Button>
          </Link>
        </ResultCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell className="py-10">
      <ResetPasswordForm
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={submit}
      />
    </AuthShell>
  );
}