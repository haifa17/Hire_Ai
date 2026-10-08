"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { FullPageSpinner } from "@/components/auth/FullPageSpinner";
import { ResultCard } from "@/components/auth/ResultCard";
import { getDashboardPath } from "@/lib/auth/routes";
import { useAuthStore } from "@/store/useAuthStore";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { useChangePassword } from "../hooks/useChangePassword";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function ChangePasswordContent() {
  const t = useTranslations("auth.changePassword");
  const gate = useRequireAuth();
  const role = useAuthStore((s) => s.user?.role);
  const { status, error, isSubmitting, submit } = useChangePassword();

  if (gate === "loading") return <FullPageSpinner />;
  if (gate === "guest" || !role) return null; // redirecting to login

  const dashboardHref = getDashboardPath(role);

  if (status === "success") {
    return (
      <AuthShell className="py-12 text-center">
        <ResultCard
          tone="success"
          heading={t("successHeading")}
          message={t("successBody")}
        >
          <Link href={dashboardHref} className="w-full">
            <Button className="w-full">{t("backToDashboard")}</Button>
          </Link>
        </ResultCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell className="py-10">
      <ChangePasswordForm
        error={error}
        isSubmitting={isSubmitting}
        dashboardHref={dashboardHref}
        onSubmit={submit}
      />
    </AuthShell>
  );
}
