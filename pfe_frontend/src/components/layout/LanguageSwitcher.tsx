"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { locales, localeCookieName, type Locale } from "@/i18n/config";

const LABELS: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
};

function persistLocaleCookie(next: Locale) {
  document.cookie = `${localeCookieName}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();

  const setLocale = (next: Locale) => {
    if (next === locale) return;
    persistLocaleCookie(next);
    router.refresh();
  };

  return (
    <div className="flex items-center rounded-full border border-gray-200 p-0.5 text-xs font-semibold">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            locale === l
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:text-blue-600"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
