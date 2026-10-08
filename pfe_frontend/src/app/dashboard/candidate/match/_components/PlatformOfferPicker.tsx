"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Loader2, MapPin, Search } from "lucide-react";
import { usePublicJobOffers } from "@/features/jobs/hooks/useJobOffers";
import type { JobOffer } from "@/domain/models/JobOffer";

const RESULTS_LIMIT = 6;
const SEARCH_DEBOUNCE_MS = 300;

function formatLocation(job: JobOffer): string {
  return [job.city, job.country].filter(Boolean).join(", ") || job.location;
}

function SelectedOffer({
  job,
  onChange,
}: Readonly<{ job: JobOffer; onChange: () => void }>) {
  const t = useTranslations("offerMatch.platform");

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-blue-700">{t("selected")}</p>
          <p className="mt-1 font-semibold text-slate-900">{job.title}</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {job.company?.name ?? t("unknownCompany")}
            {formatLocation(job) && ` · ${formatLocation(job)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          {t("change")}
        </button>
      </div>
    </div>
  );
}

type PlatformOfferPickerProps = {
  selectedJob: JobOffer | null;
  isLoadingSelection: boolean;
  onSelect: (job: JobOffer | null) => void;
};

/** Search the platform's published offers and pick one. */
export function PlatformOfferPicker({
  selectedJob,
  isLoadingSelection,
  onSelect,
}: PlatformOfferPickerProps) {
  const t = useTranslations("offerMatch.platform");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const offers = usePublicJobOffers({
    page: 1,
    limit: RESULTS_LIMIT,
    search: debouncedSearch || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (isLoadingSelection) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (selectedJob) {
    return <SelectedOffer job={selectedJob} onChange={() => onSelect(null)} />;
  }

  const items = offers.data?.items ?? [];

  const renderResults = () => {
    if (offers.isLoading) {
      return (
        <p className="flex items-center gap-2 px-1 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </p>
      );
    }
    if (offers.isError) {
      return <p className="px-1 py-4 text-sm text-red-600">{t("loadError")}</p>;
    }
    if (items.length === 0) {
      return <p className="px-1 py-4 text-sm text-slate-500">{t("empty")}</p>;
    }
    return (
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {items.map((job) => (
          <li key={job.id}>
            <button
              type="button"
              onClick={() => onSelect(job)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">
                  {job.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                  {job.company?.name ?? t("unknownCompany")}
                  {formatLocation(job) && (
                    <>
                      <MapPin className="ml-1 h-3 w-3 shrink-0" />
                      {formatLocation(job)}
                    </>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-3">
      <label htmlFor="offer-search" className="block text-sm font-medium text-slate-700">
        {t("searchLabel")}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="offer-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="form-input pl-9"
        />
      </div>
      {renderResults()}
    </div>
  );
}
