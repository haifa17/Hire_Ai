"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/auth/ErrorAlert";
import { PasswordField } from "@/components/auth/PasswordField";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

type ResetPasswordFormProps = {
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (password: string, confirmation: string) => void;
};

export function ResetPasswordForm({
  error,
  isSubmitting,
  onSubmit,
}: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSubmit(
      data.get("newPassword")?.toString() ?? "",
      data.get("confirmPassword")?.toString() ?? "",
    );
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
          id="newPassword"
          name="newPassword"
          label={t("newPasswordLabel")}
          hint={t("passwordHint")}
          minLength={MIN_PASSWORD_LENGTH}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          required
        />
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label={t("confirmPasswordLabel")}
          hint={t("confirmPasswordHint")}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          required
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
        {t("rememberedPassword")}{" "}
        <Link
          href="/login"
          className="font-semibold text-blue-600 transition-colors hover:text-blue-500"
        >
          {t("signInLink")}
        </Link>
      </p>
    </>
  );
}