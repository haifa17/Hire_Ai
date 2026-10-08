"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { ErrorAlert } from "@/components/auth/ErrorAlert";
import { FullPageSpinner } from "@/components/auth/FullPageSpinner";
import { ResultCard } from "@/components/auth/ResultCard";
import { useRedirectIfAuthenticated } from "../../../../hooks/useRedirectIfAuthenticated";
import { useRegister, type AccountType } from "../hooks/useRegister";
import { AccountTypeSelector } from "./AccountTypeSelector";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { RegisterForm } from "./RegisterForm";

export function RegisterContent() {
  const t = useTranslations("auth.register");
  const gate = useRedirectIfAuthenticated();
  const [accountType, setAccountType] = useState<AccountType>("candidate");
  const { status, error, isSubmitting, submit, signUpWithGoogle } =
    useRegister(accountType);

  if (gate === "loading") return <FullPageSpinner />;
  if (gate === "authenticated") return null; // redirecting

  if (status === "registered") {
    return (
      <AuthShell maxWidth="lg" decorated={false} className="py-10">
        <ResultCard
          tone="success"
          icon={MailCheck}
          heading={t("checkInboxHeading")}
          message={t("checkInboxBody")}
        >
          <Link href="/login" className="w-full">
            <Button className="w-full">{t("goToLogin")}</Button>
          </Link>
        </ResultCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell maxWidth="lg" decorated={false} className="py-10">
      <h1 className="text-2xl font-bold text-gray-900">{t("heading")}</h1>
      <p className="mt-1 text-sm text-gray-500">{t("subheading")}</p>

      <ErrorAlert message={error} className="mt-4" />

      <div className="mt-7">
        <AccountTypeSelector value={accountType} onChange={setAccountType} />
      </div>

      <div className="mt-7">
        <GoogleAuthButton accountType={accountType} onClick={signUpWithGoogle} />
      </div>

      <div className="mt-8">
        <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400">
          {t("step2Title")}
        </p>
        <RegisterForm isSubmitting={isSubmitting} onSubmit={submit} />
      </div>
    </AuthShell>
  );
}