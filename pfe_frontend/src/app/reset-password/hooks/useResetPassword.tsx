import { useState } from "react";
import { useTranslations } from "next-intl";
import { authService, getApiErrorMessage } from "@/services/authService";
import { MIN_PASSWORD_LENGTH, isStrongPassword } from "@/lib/auth/password";

type Status = "idle" | "submitting" | "success";

export function useResetPassword(token: string) {
  const t = useTranslations("auth.resetPassword");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const validate = (password: string, confirmation: string): string | null => {
    if (!token) return t("errorTokenMissing");
    if (password !== confirmation) return t("errorPasswordsDoNotMatch");
    if (password.length < MIN_PASSWORD_LENGTH) return t("errorPasswordTooShort");
    if (!isStrongPassword(password)) return t("errorPasswordInvalid");
    return null;
  };

  const submit = async (password: string, confirmation: string) => {
    if (status === "submitting") return;

    const validationError = validate(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStatus("submitting");
    try {
      await authService.resetPassword(token, password);
      setStatus("success");
    } catch (err) {
      setError(getApiErrorMessage(err, t("errorFallback")));
      setStatus("idle");
    }
  };

  return {
    status,
    error,
    isSubmitting: status === "submitting",
    submit,
  };
}