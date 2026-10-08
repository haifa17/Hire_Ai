import { useState } from "react";
import { useTranslations } from "next-intl";
import { authService, getApiErrorMessage } from "@/services/authService";

type Status = "idle" | "submitting" | "sent";

export function useForgotPassword() {
  const t = useTranslations("auth.forgotPassword");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (email: string) => {
    if (status === "submitting") return;

    setError(null);
    setStatus("submitting");
    try {
      await authService.forgotPassword(email);
      setStatus("sent");
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
