"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FilterX,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { InterviewCard } from "@/components/interviews/InterviewCard";
import { Button } from "@/components/ui/Button";
import { useMyInterviews } from "@/features/interviews/hooks/useInterviews";

export default function RecruiterInterviewsPage() {
  const t = useTranslations("recruiterDashboard.interviews");
  const searchParams = useSearchParams();
  const jobOfferId = searchParams.get("jobOfferId") ?? "";
  const candidateId = searchParams.get("candidateId") ?? "";
  const interviewsQuery = useMyInterviews();

  // Filter interviews according to jobOfferId or candidateId
  const interviews = useMemo(() => {
    const items = interviewsQuery.data ?? [];
    if (!jobOfferId && !candidateId) return items;
    return items.filter((item) => {
      if (jobOfferId && candidateId) {
        return (
          item.jobOfferId === jobOfferId && item.candidateId === candidateId
        );
      }
      if (jobOfferId) return item.jobOfferId === jobOfferId;
      return item.candidateId === candidateId;
    });
  }, [interviewsQuery.data, jobOfferId, candidateId]);

  // Dynamically resolve job offer title for the filter badge
  const filteredJobTitle = useMemo(() => {
    if (!jobOfferId) return "";
    const item = interviewsQuery.data?.find((i) => i.jobOfferId === jobOfferId);
    return item?.jobOffer?.title ?? t("selectedJobOffer");
  }, [interviewsQuery.data, jobOfferId, t]);

  // Dynamically resolve candidate name for the filter badge
  const filteredCandidateName = useMemo(() => {
    if (!candidateId) return "";
    const item = interviewsQuery.data?.find((i) => i.candidateId === candidateId);
    if (!item?.candidate) return t("selectedCandidate");
    return `${item.candidate.firstName ?? ""} ${item.candidate.lastName ?? ""}`.trim() || t("selectedCandidate");
  }, [interviewsQuery.data, candidateId, t]);

  const isFiltered = Boolean(jobOfferId || candidateId);
  const emptyTitle = isFiltered
    ? t("emptyState.filteredTitle")
    : t("emptyState.defaultTitle");
  const emptyDescription = isFiltered
    ? t("emptyState.filteredDescription")
    : t("emptyState.defaultDescription");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Premium Header */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-slate-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-2.5 rounded-lg bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>{t("workspaceBadge")}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">

          <Link href="/dashboard/recruiter/jobs" className="inline-flex">
            <Button variant="outline" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
              <ArrowRight className="h-4 w-4 text-slate-400" />
              {t("viewJobs")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Nominative Filters */}
      {isFiltered && (
        <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-indigo-50 bg-slate-50/40 p-4 sm:flex-row sm:items-center sm:gap-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
            {t("activeFilters")}
          </span>
          <div className="flex flex-wrap gap-2">
            {jobOfferId && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/70 py-1 pl-2.5 pr-1.5 text-xs font-medium text-indigo-700 shadow-sm">
                <span>{t("jobFilterLabel")} <strong className="font-semibold">{filteredJobTitle}</strong></span>
                <Link
                  href={candidateId ? `/dashboard/recruiter/interviews?candidateId=${candidateId}` : "/dashboard/recruiter/interviews"}
                  className="rounded-lg p-0.5 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors"
                  title={t("removeJobFilter")}
                >
                  <FilterX className="h-3.5 w-3.5" />
                </Link>
              </span>
            )}
            {candidateId && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/70 py-1 pl-2.5 pr-1.5 text-xs font-medium text-indigo-700 shadow-sm">
                <span>{t("candidateFilterLabel")} <strong className="font-semibold">{filteredCandidateName}</strong></span>
                <Link
                  href={jobOfferId ? `/dashboard/recruiter/interviews?jobOfferId=${jobOfferId}` : "/dashboard/recruiter/interviews"}
                  className="rounded-lg p-0.5 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors"
                  title={t("removeCandidateFilter")}
                >
                  <FilterX className="h-3.5 w-3.5" />
                </Link>
              </span>
            )}
            <Link
              href="/dashboard/recruiter/interviews"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            >
              {t("clearAll")}
            </Link>
          </div>
        </div>
      )}

      {/* KPI Stats Panel */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("stats.total")}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors duration-200">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {interviews.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isFiltered ? t("stats.matchingFilters") : t("stats.scheduledAcrossJobs")}
          </p>
        </div>

        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("stats.upcoming")}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors duration-200">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {
              interviews.filter(
                (item) =>
                  item.status === "SCHEDULED" || item.status === "RESCHEDULED",
              ).length
            }
          </p>
          <p className="mt-1 text-xs text-amber-600/90 font-medium">
            {t("stats.pendingEvaluations")}
          </p>
        </div>

        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("stats.completed")}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors duration-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {interviews.filter((item) => item.status === "COMPLETED").length}
          </p>
          <p className="mt-1 text-xs text-emerald-600/90 font-medium">
            {t("stats.assessedArchived")}
          </p>
        </div>
      </div>

      {/* Main List & Content Logic */}
      {(() => {
        if (interviewsQuery.isLoading) {
          return (
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
                >
                  <div className="space-y-4 animate-pulse">
                    {/* Top Badges */}
                    <div className="flex gap-2">
                      <div className="h-5.5 w-20 rounded-full bg-slate-100" />
                      <div className="h-5.5 w-16 rounded-full bg-slate-50" />
                    </div>
                    {/* Title & Date */}
                    <div className="space-y-2.5">
                      <div className="h-5.5 w-1/3 rounded-lg bg-slate-100" />
                      <div className="h-4 w-1/4 rounded-lg bg-slate-50" />
                    </div>
                    {/* Grid Details */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-slate-100 shrink-0" />
                        <div className="h-4 w-28 rounded bg-slate-50" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-slate-100 shrink-0" />
                        <div className="h-4 w-36 rounded bg-slate-50" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-slate-100 shrink-0" />
                        <div className="h-4 w-40 rounded bg-slate-50" />
                      </div>
                    </div>
                  </div>
                  {/* Action button skeleton */}
                  <div className="absolute right-6 top-6 hidden h-9 w-28 rounded-lg bg-slate-100/80 lg:block animate-pulse" />
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-50/50 to-transparent" />
                </div>
              ))}
            </div>
          );
        }

        if (interviews.length === 0) {
          return (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm max-w-2xl mx-auto mt-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                <CalendarDays className="h-7 w-7" />
              </div>
              <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
                {emptyTitle}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                {emptyDescription}
              </p>
              <div className="mt-8 flex justify-center gap-3">
                {isFiltered ? (
                  <Link
                    href="/dashboard/recruiter/interviews"
                    className="inline-flex"
                  >
                    <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700">
                      {t("emptyState.clearFilters")}
                    </Button>
                  </Link>
                ) : null}
                <Link
                  href="/dashboard/recruiter/interviews/schedule"
                  className="inline-flex"
                >
                  <Button className="bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-sm shadow-indigo-100 hover:shadow-md transition-all duration-200">
                    {t("emptyState.scheduleInterview")}
                  </Button>
                </Link>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                role="recruiter"
                href={`/dashboard/recruiter/interviews/${interview.id}`}
                actionLabel={t("reviewDetails")}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
