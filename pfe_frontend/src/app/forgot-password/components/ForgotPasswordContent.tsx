"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResultCard } from "@/components/auth/ResultCard";
import { useForgotPassword } from "../hooks/useForgotPassword";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export function ForgotPasswordContent() {
  const t = useTranslations("auth.forgotPassword");
  const { status, error, isSubmitting, submit } = useForgotPassword();

  return (
    <AuthShell className="py-12 text-center">
      {status === "sent" ? (
        <ResultCard
          tone="success"
          icon={MailCheck}
          heading={t("checkEmailHeading")}
          message={t("checkEmailBody")}
        >
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              {t("returnToLogin")}
            </Button>
          </Link>
        </ResultCard>
      ) : (
        <ForgotPasswordForm
          error={error}
          isSubmitting={isSubmitting}
          onSubmit={submit}
        />
      )}
    </AuthShell>
  );
}
