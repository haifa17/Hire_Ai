"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/auth/ErrorAlert";
import { PasswordField } from "@/components/auth/PasswordField";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import type { ChangePasswordValues } from "../hooks/useChangePassword";

type ChangePasswordFormProps = {
  error: string | null;
  isSubmitting: boolean;
  dashboardHref: string;
  onSubmit: (values: ChangePasswordValues) => void;
};

export function ChangePasswordForm({
  error,
  isSubmitting,
  dashboardHref,
  onSubmit,
}: ChangePasswordFormProps) {
  const t = useTranslations("auth.changePassword");
  const toggleLabels = {
    showLabel: t("showPassword"),
    hideLabel: t("hidePassword"),
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSubmit({
      currentPassword: data.get("currentPassword")?.toString() ?? "",
      newPassword: data.get("newPassword")?.toString() ?? "",
      confirmation: data.get("confirmPassword")?.toString() ?? "",
    });
  };

  return (
    <>
      <h1 className="text-center text-2xl font-bold text-gray-900">
        {t("heading")}
      </h1>
      <p className="mt-2 text-center text-sm text-gray-500">{t("subheading")}</p>

      <ErrorAlert message={error} className="mt-5" />

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <PasswordField
          id="currentPassword"
          name="currentPassword"
          label={t("currentPasswordLabel")}
          autoComplete="current-password"
          required
          {...toggleLabels}
        />
        <PasswordField
          id="newPassword"
          name="newPassword"
          label={t("newPasswordLabel")}
          hint={t("passwordHint")}
          minLength={MIN_PASSWORD_LENGTH}
          required
          {...toggleLabels}
        />
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label={t("confirmPasswordLabel")}
          hint={t("confirmPasswordHint")}
          required
          {...toggleLabels}
        />

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full"
        >
          {t("submit")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        {t("goBackTo")}{" "}
        <Link
          href={dashboardHref}
          className="font-semibold text-blue-600 transition-colors hover:text-blue-500"
        >
          {t("dashboard")}
        </Link>
      </p>
    </>
  );
}
