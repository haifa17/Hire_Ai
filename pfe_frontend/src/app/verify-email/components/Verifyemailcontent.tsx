"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useVerifyEmail } from "../hooks/useVerifyEmail";
import { ResultCard } from "../../../components/auth/ResultCard";

export function VerifyEmailContent() {
  const t = useTranslations("auth.verifyEmail");
  const token = useSearchParams().get("token");
  const state = useVerifyEmail(token);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-130 w-130 rounded-full bg-blue-100/60"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white px-10 py-12 text-center shadow-lg">
        {state.status === "loading" && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 py-6"
          >
            <Loader2
              className="h-12 w-12 animate-spin text-blue-500"
              aria-hidden="true"
            />
            <p className="text-sm text-gray-500">{t("verifying")}</p>
          </div>
        )}

        {state.status === "success" && (
          <ResultCard
            tone="success"
            heading={t("successHeading")}
            message={state.message}
          >
            <Link href="/login" className="w-full">
              <Button className="w-full">{t("signIn")}</Button>
            </Link>
          </ResultCard>
        )}

        {state.status === "error" && (
          <ResultCard
            tone="error"
            heading={t("errorHeading")}
            message={state.message}
          >
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                {t("backToLogin")}
              </Button>
            </Link>
          </ResultCard>
        )}
      </div>
    </main>
  );
}