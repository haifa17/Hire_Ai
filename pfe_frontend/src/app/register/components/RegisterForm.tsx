"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/auth/FormField";
import { PasswordField } from "@/components/auth/PasswordField";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import type { RegisterValues } from "../hooks/useRegister";

// TODO: point these at the real legal pages.
const LEGAL_HREF = { terms: "#", privacy: "#" } as const;

type RegisterFormProps = {
  isSubmitting: boolean;
  onSubmit: (values: RegisterValues) => void;
};

export function RegisterForm({ isSubmitting, onSubmit }: RegisterFormProps) {
  const t = useTranslations("auth.register");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const field = (name: string) => data.get(name)?.toString() ?? "";

    onSubmit({
      firstName: field("firstName"),
      lastName: field("lastName"),
      email: field("email"),
      password: field("password"),
      acceptedTerms: data.get("terms") !== null,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="firstName"
          name="firstName"
          label={t("firstNameLabel")}
          icon={User}
          autoComplete="given-name"
          placeholder={t("firstNamePlaceholder")}
          required
        />
        <FormField
          id="lastName"
          name="lastName"
          label={t("lastNameLabel")}
          icon={User}
          autoComplete="family-name"
          placeholder={t("lastNamePlaceholder")}
          required
        />
      </div>

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

      <PasswordField
        id="password"
        name="password"
        label={t("passwordLabel")}
        showLabel={t("showPassword")}
        hideLabel={t("hidePassword")}
        hint={t("passwordHint")}
        minLength={MIN_PASSWORD_LENGTH}
        required
      />

      <div className="flex items-start gap-2.5 pt-1">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="terms" className="cursor-pointer text-xs text-gray-600">
          {t("agreeTermsPrefix")}{" "}
          <Link href={LEGAL_HREF.terms} className="text-blue-600 hover:underline">
            {t("termsOfService")}
          </Link>{" "}
          {t("and")}{" "}
          <Link href={LEGAL_HREF.privacy} className="text-blue-600 hover:underline">
            {t("privacyPolicy")}
          </Link>
          .
        </label>
      </div>

      <Button
        type="submit"
        isLoading={isSubmitting}
        className="mt-2 w-full gap-2"
      >
        {t("submit")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}