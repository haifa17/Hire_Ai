"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Briefcase,
  CircleDollarSign,
  Clock3,
  Filter,
  LocateFixed,
  MapPin,
  Search,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { usePublicJobOffers } from "@/features/jobs/hooks/useJobOffers";
import { useTranslations } from "next-intl";
import type {
  JobEmploymentType,
  JobExperienceLevel,
  JobOffer,
  JobOfferFilters,
  JobWorkplaceType,
} from "@/domain/models/JobOffer";

const EMPLOYMENT_OPTION_VALUES: JobEmploymentType[] = [
  "FULL_TIME",
  "CDD",
  "CDI",
  "CONTRACT",
  "PART_TIME",
];

const WORKPLACE_OPTION_VALUES: JobWorkplaceType[] = [
  "REMOTE",
  "HYBRID",
  "ONSITE",
];

const EXPERIENCE_OPTION_VALUES: JobExperienceLevel[] = [
  "JUNIOR",
  "MID",
  "SENIOR",
];

type Translator = ReturnType<typeof useTranslations>;

function formatRelativeDate(dateInput: string, t: Translator): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60),
  );

  if (diffHours < 1) return t("justNow");
  if (diffHours < 24) return t("hoursAgo", { hours: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return t("daysAgo", { days: diffDays });

  return date.toLocaleDateString();
}

function formatEmploymentType(type: JobEmploymentType): string {
  if (type === "CDD") return "CDD";
  if (type === "CDI") return "CDI";
  return type
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join("-");
}

function formatCurrencyRange(job: JobOffer, t: Translator): string {
  if (job.salaryMin === null || job.salaryMax === null)
    return t("salaryNotSpecified");
  if (job.salaryMin === undefined || job.salaryMax === undefined)
    return t("salaryNotSpecified");

  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);

  if (Number.isNaN(min) || Number.isNaN(max)) return t("salaryNotSpecified");

  return `${job.currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
}

export default function CandidateJobsPage() {
  const t = useTranslations("candidateDashboard.jobs");
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [minSalary, setMinSalary] = useState<string>("");
  const [workplaceType, setWorkplaceType] = useState<JobWorkplaceType | "">("");
  const [employmentType, setEmploymentType] = useState<JobEmploymentType | "">(
    "",
  );
  const [experienceLevel, setExperienceLevel] = useState<
    JobExperienceLevel | ""
  >("");

  const filters: JobOfferFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      city: city.trim() || undefined,
      workplaceType: workplaceType || undefined,
      employmentType: employmentType || undefined,
      experienceLevel: experienceLevel || undefined,
      minSalary: minSalary ? Number(minSalary) : undefined,
      status: "PUBLISHED",
      page,
      limit: 8,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [
      city,
      employmentType,
      experienceLevel,
      minSalary,
      page,
      search,
      workplaceType,
    ],
  );

  const jobsQuery = usePublicJobOffers(filters);

  const jobs = useMemo(() => jobsQuery.data?.items ?? [], [jobsQuery.data]);
  const pagination = jobsQuery.data?.pagination;

  const pageItems = useMemo(() => {
    if (!pagination || pagination.totalPages <= 1) return [1];

    const current = pagination.page;
    const total = pagination.totalPages;
    const start = Math.max(1, current - 1);
    const end = Math.min(total, current + 1);
    const items: Array<number | "..."> = [];

    items.push(1);

    if (start > 2) {
      items.push("...");
    }

    for (
      let value = Math.max(2, start);
      value <= Math.min(total - 1, end);
      value += 1
    ) {
      items.push(value);
    }

    if (end < total - 1) {
      items.push("...");
    }

    if (total > 1) {
      items.push(total);
    }

    return items;
  }, [pagination]);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t("recommended")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("matchesFound", { count: jobsQuery.data?.pagination.total ?? 0 })}
            </p>
          </div>
          <Button variant="outline" onClick={() => jobsQuery.refetch()}>
            {t("refresh")}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="relative">
            <LocateFixed className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t("cityPlaceholder")}
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
              <Filter className="h-4 w-4" />
              {t("filters")}
            </h2>
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              onClick={() => {
                setSearch("");
                setCity("");
                setMinSalary("");
                setWorkplaceType("");
                setEmploymentType("");
                setExperienceLevel("");
                setPage(1);
              }}
            >
              {t("reset")}
            </button>
          </div>

          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-900">
                {t("location")}
              </legend>
              {WORKPLACE_OPTION_VALUES.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={workplaceType === value}
                    onChange={() => {
                      setWorkplaceType((current) =>
                        current === value ? "" : value,
                      );
                      setPage(1);
                    }}
                  />
                  {t(`workplaceOptions.${value}`)}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-900">
                {t("contractType")}
              </legend>
              {EMPLOYMENT_OPTION_VALUES.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={employmentType === value}
                    onChange={() => {
                      setEmploymentType((current) =>
                        current === value ? "" : value,
                      );
                      setPage(1);
                    }}
                  />
                  {t(`employmentOptions.${value}`)}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-900">
                {t("experience")}
              </legend>
              {EXPERIENCE_OPTION_VALUES.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={experienceLevel === value}
                    onChange={() => {
                      setExperienceLevel((current) =>
                        current === value ? "" : value,
                      );
                      setPage(1);
                    }}
                  />
                  {t(`experienceOptions.${value}`)}
                </label>
              ))}
            </fieldset>

            <div className="space-y-2">
              <label
                htmlFor="min-salary"
                className="text-sm font-medium text-gray-900"
              >
                {t("minSalary")}
              </label>
              <Input
                id="min-salary"
                placeholder={t("minSalaryPlaceholder")}
                value={minSalary}
                onChange={(event) => {
                  setMinSalary(event.target.value.replaceAll(/[^\d]/g, ""));
                  setPage(1);
                }}
                inputMode="numeric"
              />
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {jobsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`candidate-jobs-skeleton-${index + 1}`}
                  className="h-36 animate-pulse rounded-2xl bg-gray-200"
                />
              ))}
            </div>
          ) : null}

          {!jobsQuery.isLoading && jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {t("noJobsFound")}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t("noJobsHint")}
              </p>
            </div>
          ) : null}

          {jobs.map((job) => {
            const recruiterName =
              `${job.recruiter?.firstName ?? ""} ${job.recruiter?.lastName ?? ""}`.trim();
            let detailsUrl: string;
            if (user?.role === "RECRUITER") {
              detailsUrl = `/dashboard/recruiter/jobs/${job.id}`;
            } else if (user?.role === "ADMIN") {
              detailsUrl = `/dashboard/admin/jobs/${job.id}`;
            } else {
              detailsUrl = `/dashboard/candidate/jobs/${job.id}`;
            }
            const canApply = !user || user.role === "CANDIDATE";

            return (
              <article
                key={job.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
                      {job.company?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            job.company.logoUrl.startsWith("/")
                              ? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}${job.company.logoUrl}`
                              : job.company.logoUrl
                          }
                          alt={job.company?.name ?? "Company"}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        (job.company?.name?.charAt(0) ?? "C").toUpperCase()
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={detailsUrl}>
                          <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {job.title}
                          </h3>
                        </Link>
                      </div>
                      <p className="text-sm text-gray-600">
                        {job.company?.name ?? t("unknownCompany")} • {job.city},{" "}
                        {job.country}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.workplaceType === "ONSITE"
                            ? t("workplaceOptions.ONSITE")
                            : job.workplaceType}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
                          <CircleDollarSign className="h-3.5 w-3.5" />
                          {formatCurrencyRange(job, t)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {formatEmploymentType(job.employmentType)}
                        </span>
                      </div>

                      <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500">
                        <UserRound className="h-3.5 w-3.5" />
                        {t("recruiterLabel", { name: recruiterName || t("hiringTeam") })}
                        <Clock3 className="ml-2 h-3.5 w-3.5" />
                        {formatRelativeDate(job.createdAt, t)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-center">
                    <div className="flex items-center gap-2">
                      <Link href={detailsUrl}>
                        <Button variant="outline" size="sm">
                          {t("viewDetails")}
                        </Button>
                      </Link>
                      {canApply && (
                        <Link href={`/dashboard/candidate/apply?jobId=${job.id}`}>
                          <Button size="sm">{t("quickApply")}</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {pagination ? (
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm">
              <p className="text-gray-600">
                {t("pageOf", { page: pagination.page, totalPages: pagination.totalPages, total: pagination.total })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevious || jobsQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t("previous")}
                </Button>
                {pageItems.map((item, index) =>
                  item === "..." ? (
                    <span
                      key={`ellipsis-${index + 1}`}
                      className="px-1 text-sm font-medium text-gray-500"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={`page-${item}`}
                      variant={item === pagination.page ? "primary" : "outline"}
                      size="sm"
                      disabled={jobsQuery.isFetching}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext || jobsQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
