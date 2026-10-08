"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, LayoutList, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountType } from "../hooks/useRegister";

const OPTIONS = [
  {
    value: "candidate",
    Icon: Users,
    label: "candidate",
    description: "candidateDescription",
  },
  {
    value: "recruiter",
    Icon: LayoutList,
    label: "recruiter",
    description: "recruiterDescription",
  },
] as const;

type AccountTypeSelectorProps = {
  value: AccountType;
  onChange: (value: AccountType) => void;
};

export function AccountTypeSelector({ value, onChange }: AccountTypeSelectorProps) {
  const t = useTranslations("auth.register");

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">
        {t("step1Title")}
      </p>
      <p id="account-type-label" className="mb-3 text-sm text-gray-700">
        {t("iAmA")}
      </p>

      <div
        role="group"
        aria-labelledby="account-type-label"
        className="grid grid-cols-2 gap-3"
      >
        {OPTIONS.map(({ value: optionValue, Icon, label, description }) => {
          const selected = optionValue === value;

          return (
            <button
              key={optionValue}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(optionValue)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 transition-all",
                selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300",
              )}
            >
              {selected && (
                <CheckCircle2
                  className="absolute right-2 top-2 h-4 w-4 text-blue-500"
                  aria-hidden="true"
                />
              )}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Icon className="h-6 w-6 text-blue-500" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-gray-900">{t(label)}</span>
              <span className="text-center text-xs text-gray-500">{t(description)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}