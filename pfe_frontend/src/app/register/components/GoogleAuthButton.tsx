"use client";

import { useTranslations } from "next-intl";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import type { AccountType } from "../hooks/useRegister";

type GoogleAuthButtonProps = {
  accountType: AccountType;
  onClick: () => void;
};

export function GoogleAuthButton({ accountType, onClick }: GoogleAuthButtonProps) {
  const t = useTranslations("auth.register");

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      <GoogleIcon className="h-4 w-4" />
      {t("continueWithGoogleAs")} {t(accountType)}
    </button>
  );
}