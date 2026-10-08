import { useState } from "react";
import { useTranslations } from "next-intl";
import { authService, getApiErrorMessage } from "@/services/authService";
import { MIN_PASSWORD_LENGTH, isStrongPassword } from "@/lib/auth/password";

export type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
};

type Status = "idle" | "submitting" | "success";

export function useChangePassword() {
  const t = useTranslations("auth.changePassword");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const validate = ({
    currentPassword,
    newPassword,
    confirmation,
  }: ChangePasswordValues): string | null => {
    if (!currentPassword) return t("errorCurrentPasswordRequired");
    if (newPassword !== confirmation) return t("errorPasswordsDoNotMatch");
    if (newPassword.length < MIN_PASSWORD_LENGTH) return t("errorPasswordTooShort");
    if (!isStrongPassword(newPassword)) return t("errorPasswordInvalid");
    return null;
  };

  const submit = async (values: ChangePasswordValues) => {
    if (status === "submitting") return;

    const validationError = validate(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStatus("submitting");
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
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
