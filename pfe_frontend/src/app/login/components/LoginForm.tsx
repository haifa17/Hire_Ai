"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/auth/FormField";
import { PasswordField } from "@/components/auth/PasswordField";
import type { LoginCredentials } from "../hooks/useLogin";

type LoginFormProps = {
  isSubmitting: boolean;
  onSubmit: (credentials: LoginCredentials) => void;
};

export function LoginForm({ isSubmitting, onSubmit }: LoginFormProps) {
  const t = useTranslations("auth.login");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    onSubmit({
      email: data.get("email")?.toString() ?? "",
      password: data.get("password")?.toString() ?? "",
      keepLoggedIn: data.get("keepLoggedIn") !== null,
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormField
        id="email"
        name="email"
        type="email"
        label={t("emailLabel")}
        autoComplete="email"
        placeholder={t("emailPlaceholder")}
        required
      />

      <PasswordField
        id="password"
        name="password"
        label={t("passwordLabel")}
        autoComplete="current-password"
        showLabel={t("showPassword")}
        hideLabel={t("hidePassword")}
        labelAction={
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-500"
          >
            {t("forgotPassword")}
          </Link>
        }
        required
      />

      <div className="flex items-center gap-2.5">
        <input
          id="keep-logged-in"
          name="keepLoggedIn"
          type="checkbox"
          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor="keep-logged-in"
          className="cursor-pointer select-none text-sm text-gray-600"
        >
          {t("keepLoggedIn")}
        </label>
      </div>

      <Button
        type="submit"
        isLoading={isSubmitting}
        className="w-full"
      >
        {t("submit")}
      </Button>
    </form>
  );
}