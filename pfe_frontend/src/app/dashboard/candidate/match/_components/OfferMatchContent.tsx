"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/auth/ErrorAlert";
import { getApiErrorMessage } from "@/services/authService";
import { useOfferMatch } from "../_hooks/useOfferMatch";
import { ExternalOfferForm } from "./ExternalOfferForm";
import { MatchResult } from "./MatchResult";
import { OfferSourceTabs } from "./OfferSourceTabs";
import { PlatformOfferPicker } from "./PlatformOfferPicker";

const CARD_CLASS = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

function ResultPlaceholder() {
  const t = useTranslations("offerMatch.result");

  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Target className="h-6 w-6" />
      </span>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">{t("placeholder")}</p>
    </div>
  );
}

function Analysing() {
  const t = useTranslations("offerMatch");

  return (
    <div
      role="status"
      className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-12 text-center"
    >
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="mt-4 text-sm font-medium text-slate-900">{t("analysing")}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{t("analysingHint")}</p>
    </div>
  );
}

export function OfferMatchContent() {
  const t = useTranslations("offerMatch");
  const page = useOfferMatch(useSearchParams().get("jobId") ?? "");

  const renderResult = () => {
    if (page.isMatching) return <Analysing />;
    if (page.response) return <MatchResult response={page.response} onReset={page.reset} />;
    return <ResultPlaceholder />;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <form
          className={`${CARD_CLASS} space-y-5`}
          onSubmit={(e) => {
            e.preventDefault();
            page.submit();
          }}
        >
          <OfferSourceTabs value={page.source} onChange={page.changeSource} />

          {page.source === "platform" ? (
            <PlatformOfferPicker
              selectedJob={page.selectedJob}
              isLoadingSelection={page.isLoadingPreselection}
              onSelect={page.selectJob}
            />
          ) : (
            <ExternalOfferForm value={page.externalOffer} onChange={page.updateExternalOffer} />
          )}

          <ErrorAlert
            message={page.error ? getApiErrorMessage(page.error, t("error.fallback")) : null}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={!page.canSubmit}
            isLoading={page.isMatching}
          >
            {t("submit")}
          </Button>
        </form>

        <section aria-live="polite" className={CARD_CLASS}>
          {renderResult()}
        </section>
      </div>
    </div>
  );
}
