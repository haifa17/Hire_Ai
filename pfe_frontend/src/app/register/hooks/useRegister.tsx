import { useState } from "react";
import { useTranslations } from "next-intl";
import { authService, getApiErrorMessage } from "@/services/authService";
import { isStrongPassword } from "@/lib/auth/password";

export type AccountType = "candidate" | "recruiter";

const ACCOUNT_ROLES = {
  candidate: "CANDIDATE",
  recruiter: "RECRUITER",
} as const satisfies Record<AccountType, string>;

export type RegisterValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
};

type Status = "idle" | "submitting" | "registered";

export function useRegister(accountType: AccountType) {
  const t = useTranslations("auth.register");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const role = ACCOUNT_ROLES[accountType];

  const submit = async ({ acceptedTerms, ...fields }: RegisterValues) => {
    if (status === "submitting") return;

    if (!acceptedTerms) {
      setError(t("errorMustAgree"));
      return;
    }

    if (!isStrongPassword(fields.password)) {
      setError(t("errorPasswordInvalid"));
      return;
    }

    setError(null);
    setStatus("submitting");
    try {
      await authService.register({ ...fields, role });
      setStatus("registered");
    } catch (err) {
      setError(getApiErrorMessage(err, t("errorFallback")));
      setStatus("idle");
    }
  };

  const signUpWithGoogle = () => {
    window.location.href = authService.getGoogleAuthUrl({
      flow: "signup",
      role,
    });
  };

  return {
    status,
    error,
    isSubmitting: status === "submitting",
    submit,
    signUpWithGoogle,
  };
}