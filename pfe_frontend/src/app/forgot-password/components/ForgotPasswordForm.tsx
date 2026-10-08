"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/auth/ErrorAlert";
import { FormField } from "@/components/auth/FormField";

type ForgotPasswordFormProps = {
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (email: string) => void;
};

export function ForgotPasswordForm({
  error,
  isSubmitting,
  onSubmit,
}: ForgotPasswordFormProps) {
  const t = useTranslations("auth.forgotPassword");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSubmit(data.get("email")?.toString() ?? "");
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">{t("heading")}</h1>
      <p className="mt-3 text-sm text-gray-500">{t("subheading")}</p>

      <ErrorAlert message={error} className="mt-4" />

      <form className="mt-8 space-y-5 text-left" onSubmit={handleSubmit}>
        <FormField
          id="email"
          name="email"
          type="email"
          label={t("emailLabel")}
          icon={Mail}
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          hint={t("emailHint")}
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

      <Link
        href="/login"
        className="mt-5 inline-flex items-center justify-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("backToLogin")}
      </Link>
    </>
  );
}
