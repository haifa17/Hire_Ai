"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { InterviewCard } from "@/components/interviews/InterviewCard";
import { Button } from "@/components/ui/Button";
import { useMyInterviews } from "@/features/interviews/hooks/useInterviews";
import { useTranslations } from "next-intl";

export default function CandidateInterviewsPage() {
  const t = useTranslations("candidateDashboard.interviews");
  const interviewsQuery = useMyInterviews();
  const interviews = interviewsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Premium Header */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-slate-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-2.5 rounded-lg bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>{t("candidateWorkspace")}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {t("myInterviews")}
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            {t("headerSubtitle")}
          </p>
        </div>

        <Link href="/dashboard/candidate/applications" className="inline-flex">
          <Button variant="outline" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs">
            {t("viewApplications")}
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Button>
        </Link>
      </div>

      {/* KPI Stats Panel */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("totalInterviews")}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors duration-200">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {interviews.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t("assignedInvitationRounds")}
          </p>
        </div>

        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("upcoming")}
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
            {t("activeMeetingSlots")}
          </p>
        </div>

        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("completed")}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors duration-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {interviews.filter((item) => item.status === "COMPLETED").length}
          </p>
          <p className="mt-1 text-xs text-emerald-600/90 font-medium">
            {t("completedEvaluations")}
          </p>
        </div>
      </div>

      {/* Main List and Loading Logic */}
      {(() => {
        if (interviewsQuery.isLoading) {
          return (
            <div className="space-y-5">
              {[1, 2].map((i) => (
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
                {t("noInterviewsYet")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                {t("noInterviewsHint")}
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/dashboard/candidate/applications"
                  className="inline-flex"
                >
                  <Button className="bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-sm shadow-indigo-100 hover:shadow-md transition-all duration-200">
                    {t("viewApplications")}
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
                role="candidate"
                href={`/dashboard/candidate/interviews/${interview.id}`}
                actionLabel={t("openDetails")}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
