import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { authService } from "@/services/authService";
import { getApiErrorMessage } from "@/lib/api-error";

export type VerifyEmailState =
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type Settled = { token: string; state: Exclude<VerifyEmailState, { status: "loading" }> };

export function useVerifyEmail(token: string | null): VerifyEmailState {
  const t = useTranslations("auth.verifyEmail");
  const [settled, setSettled] = useState<Settled | null>(null);

  // Verification tokens are typically single-use. This guard ensures we fire
  // exactly one request per token, even under React Strict Mode's double
  // effect invocation in development.
  const requestedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || requestedToken.current === token) return;
    requestedToken.current = token;

    authService
      .verifyEmail(token)
      .then((message) =>
        setSettled({ token, state: { status: "success", message } }),
      )
      .catch((error: unknown) =>
        setSettled({
          token,
          state: {
            status: "error",
            message: getApiErrorMessage(error, t("errorFallback")),
          },
        }),
      );
  }, [token, t]);

  // Derived state: no effect/setState needed for the "missing token" case.
  if (!token) return { status: "error", message: t("errorTokenMissing") };
  if (settled?.token !== token) return { status: "loading" };
  return settled.state;
}