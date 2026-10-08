"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  CircleCheckBig,
  Filter,
  Hourglass,
  Search,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";

type Translator = ReturnType<typeof useTranslations>;

type ApplicationStatus =
  | "PENDING"
  | "REVIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "ACCEPTED"
  | "REJECTED";

type ApplicationCompany = {
  name?: string | null;
  logoUrl?: string | null;
};

type ApplicationJobOffer = {
  id?: string;
  slug?: string | null;
  title?: string | null;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  company?: ApplicationCompany | null;
};

type ApplicationItem = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  aiAnalysis?: unknown;
  jobOffer?: ApplicationJobOffer | null;
};

const STATUS_OPTION_VALUES: Array<"ALL" | ApplicationStatus> = [
  "ALL",
  "PENDING",
  "REVIEWED",
  "INTERVIEW",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED",
];

const SORT_OPTION_VALUES = ["newest", "oldest"] as const;

const PAGE_SIZE = 4;

const STATUS_STYLE_CLASSNAMES: Record<ApplicationStatus, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  REVIEWED: "bg-indigo-100 text-indigo-700",
  SHORTLISTED: "bg-violet-100 text-violet-700",
  INTERVIEW: "bg-emerald-100 text-emerald-700",
  ACCEPTED: "bg-teal-100 text-teal-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

const COMPANY_ACCENTS = [
  "from-emerald-100 to-lime-100 text-emerald-700",
  "from-sky-100 to-cyan-100 text-sky-700",
  "from-amber-100 to-orange-100 text-amber-700",
  "from-zinc-100 to-stone-100 text-zinc-700",
  "from-fuchsia-100 to-pink-100 text-fuchsia-700",
] as const;

function hashText(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = Math.trunc((hash << 5) - hash + (character.codePointAt(0) ?? 0));
  }

  return hash;
}

function safeDate(dateValue: string | number | Date): Date {
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatAppliedDate(dateValue: string): string {
  return safeDate(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCompanyLocation(
  jobOffer: ApplicationJobOffer | null | undefined,
  t: Translator,
): string {
  if (!jobOffer) return t("remote");

  if (jobOffer.location) return jobOffer.location;

  const pieces = [jobOffer.city, jobOffer.country].filter(Boolean);
  return pieces.length > 0 ? pieces.join(", ") : t("remote");
}

function getStatusStyle(status: ApplicationStatus, t: Translator) {
  return {
    label: t(`statusLabels.${status}`),
    className: STATUS_STYLE_CLASSNAMES[status] ?? STATUS_STYLE_CLASSNAMES.PENDING,
  };
}

function getCompanyAccent(companyName?: string | null): string {
  const name = companyName?.trim() || "Company";

  return COMPANY_ACCENTS[Math.abs(hashText(name)) % COMPANY_ACCENTS.length];
}

function getCompanyInitials(companyName?: string | null): string {
  if (!companyName) return "NA";

  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function readNumericMatchValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getAiMatchScore(application: ApplicationItem): number | null {
  const analysis = application.aiAnalysis;

  if (analysis && typeof analysis === "object") {
    const record = analysis as Record<string, unknown>;
    const candidateValues = [
      record.matchPercentage,
      record.matchScore,
      record.overallMatch,
      record.score,
      record.atsScore,
      record.globalScore,
    ];

    for (const candidateValue of candidateValues) {
      const numericValue = readNumericMatchValue(candidateValue);
      if (numericValue !== null) {
        return Math.max(0, Math.min(100, Math.round(numericValue)));
      }
    }
  }

  return null;
}

function getApplicationHeader(application: ApplicationItem, t: Translator): string {
  return application.jobOffer?.title ?? t("untitledRole");
}

function getPageRange(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 2) return [1, 2, 3];
  if (currentPage >= totalPages - 1)
    return [totalPages - 2, totalPages - 1, totalPages];

  return [currentPage - 1, currentPage, currentPage + 1];
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-44 rounded-full bg-slate-200" />
          <div className="h-3 w-60 rounded-full bg-slate-100" />
          <div className="h-3 w-32 rounded-full bg-slate-100" />
        </div>
        <div className="h-12 w-14 rounded-xl bg-slate-100" />
        <div className="h-10 w-24 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export default function CandidateApplicationsPage() {
  const t = useTranslations("candidateDashboard.applications");
  const [apps, setApps] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ApplicationStatus>(
    "ALL",
  );
  const [sortOrder, setSortOrder] =
    useState<(typeof SORT_OPTION_VALUES)[number]>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const fetchApps = () => {
    setLoading(true);
    api
      .get("/applications/me")
      .then((res) => setApps((res.data.data ?? res.data) as ApplicationItem[]))
      .catch((err) => toast.error(err?.response?.data?.message || err.message || t("genericError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const runFetch = () => fetchApps();
    runFetch();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredApps = useMemo(() => {
    const items = apps.filter((application) => {
      const title = application.jobOffer?.title ?? "";
      const company = application.jobOffer?.company?.name ?? "";
      const location = formatCompanyLocation(application.jobOffer, t);

      const matchesSearch =
        normalizedSearch.length === 0 ||
        [title, company, location]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" || application.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    items.sort((left, right) => {
      const leftDate = safeDate(left.createdAt).getTime();
      const rightDate = safeDate(right.createdAt).getTime();
      return sortOrder === "newest"
        ? rightDate - leftDate
        : leftDate - rightDate;
    });

    return items;
  }, [apps, normalizedSearch, sortOrder, statusFilter]);

  useEffect(() => {
    const resetPage = () => setCurrentPage(1);
    resetPage();
  }, [normalizedSearch, statusFilter, sortOrder]);

  const totalApplications = apps.length;
  const interviewCount = apps.filter(
    (application) => application.status === "INTERVIEW",
  ).length;
  const pendingCount = apps.filter((application) =>
    ["PENDING", "REVIEWED"].includes(application.status),
  ).length;

  const totalPages = Math.max(1, Math.ceil(filteredApps.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageItems = filteredApps.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );
  const pageNumbers = getPageRange(safeCurrentPage, totalPages);
  const shouldShowEmptyState = !loading && pageItems.length === 0;
  const shouldShowCards = !loading && pageItems.length > 0;
  let applicationsContent: React.ReactNode = null;

  if (loading) {
    applicationsContent = [1, 2, 3].map((value) => (
      <LoadingCard key={`loading-${value}`} />
    ));
  } else if (shouldShowEmptyState) {
    applicationsContent = (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-slate-900">
          {t("noApplicationsFound")}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {t("noApplicationsHint")}
        </p>
      </div>
    );
  } else if (shouldShowCards) {
    applicationsContent = pageItems.map((application) => {
      const companyName =
        application.jobOffer?.company?.name ?? t("unknownCompany");
      const accent = getCompanyAccent(companyName);
      const statusStyle = getStatusStyle(application.status, t);
      const matchScore = getAiMatchScore(application);

      return (
        <article
          key={application.id}
          className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:px-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-linear-to-br",
                  accent,
                )}
              >
                {application.jobOffer?.company?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={application.jobOffer.company.logoUrl}
                    alt={companyName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold tracking-wide">
                    {getCompanyInitials(companyName)}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-slate-900">
                  {getApplicationHeader(application, t)}
                </h3>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {companyName} • {formatCompanyLocation(application.jobOffer, t)}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                      statusStyle.className,
                    )}
                  >
                    {statusStyle.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("appliedOn", { date: formatAppliedDate(application.createdAt) })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 md:min-w-65 md:border-t-0 md:pt-0">
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t("aiMatch")}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-500">
                  {matchScore !== null ? `${matchScore}%` : t("pending")}
                </p>
              </div>

              <div className="h-10 w-px bg-slate-200" />

              <Link
                href={`/dashboard/candidate/applications/${application.id}`}
                className={cn(
                  "inline-flex items-center gap-2 text-sm font-semibold transition-colors",
                  application.jobOffer?.id
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-slate-400",
                )}
              >
                {t("viewDetails")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const id = application.jobOffer?.id;
                if (!id) return;
                router.push(`/jobs/${id}`);
              }}
              disabled={!application.jobOffer?.id}
            >
              {t("openJob")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWithdraw(application.id)}
            >
              {t("withdraw")}
            </Button>
          </div>
        </article>
      );
    });
  }

  const handleWithdraw = async (id: string) => {
    if (!confirm(t("confirmWithdraw"))) return;
    try {
      await api.delete(`/applications/${id}`);
      toast.success(t("withdrawSuccess"));
      fetchApps();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(axiosError?.response?.data?.message || axiosError.message || t("genericError"));
    }
  };

  const renderMetricCard = (
    value: number,
    label: string,
    icon: React.ElementType,
  ) => {
    const Icon = icon;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {value}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-[#f6f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                {t("candidateWorkspace")}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {t("myApplications")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {t("headerSubtitle")}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {t("friendlyDashboardView")}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {renderMetricCard(
              totalApplications,
              t("totalApplications"),
              Briefcase,
            )}
            {renderMetricCard(
              interviewCount,
              t("interviewsScheduled"),
              CircleCheckBig,
            )}
            {renderMetricCard(pendingCount, t("pendingResponses"), Hourglass)}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as typeof statusFilter)
                  }
                  className="bg-transparent text-sm outline-none"
                >
                  {STATUS_OPTION_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value === "ALL" ? t("allStatuses") : t(`statusLabels.${value}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Briefcase className="h-4 w-4 text-slate-400" />
                <select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(event.target.value as typeof sortOrder)
                  }
                  className="bg-transparent text-sm outline-none"
                >
                  {SORT_OPTION_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {t(`sortOptions.${value}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">{applicationsContent}</div>

          {!loading && filteredApps.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {t("showingCount", { shown: pageItems.length, total: filteredApps.length })}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((value) => Math.max(1, value - 1))
                  }
                  disabled={safeCurrentPage === 1}
                >
                  {t("previous")}
                </Button>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={cn(
                        "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors",
                        pageNumber === safeCurrentPage
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
