"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Video,
  Building2,
  MessageSquare,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useInterviewById } from "@/features/interviews/hooks/useInterviews";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Invalid date";
  }
}

interface StatusConfig {
  dotColor: string;
  colorClass: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  SCHEDULED: {
    dotColor: "bg-blue-500",
    colorClass: "bg-blue-50 text-blue-700 ring-blue-600/15",
  },
  RESCHEDULED: {
    dotColor: "bg-amber-500",
    colorClass: "bg-amber-50 text-amber-700 ring-amber-600/15",
  },
  COMPLETED: {
    dotColor: "bg-emerald-500",
    colorClass: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  },
  CANCELLED: {
    dotColor: "bg-rose-500",
    colorClass: "bg-rose-50 text-rose-700 ring-rose-600/15",
  },
};

interface TypeConfig {
  icon: typeof Video | typeof Phone | typeof Building2;
  colorClass: string;
}

const TYPE_CONFIGS: Record<string, TypeConfig> = {
  VIDEO: {
    icon: Video,
    colorClass: "bg-purple-50 text-purple-700 ring-purple-600/10",
  },
  ONSITE: {
    icon: Building2,
    colorClass: "bg-cyan-50 text-cyan-700 ring-cyan-600/10",
  },
  PHONE: {
    icon: Phone,
    colorClass: "bg-teal-50 text-teal-700 ring-teal-600/10",
  },
};

function getInitials(name: string) {
  if (!name || name === "Unknown") return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function CandidateInterviewDetailsPage() {
  const t = useTranslations("candidateDashboard.interviewDetail");
  const params = useParams() as { id?: string };
  const id = params?.id ?? "";
  const interviewQuery = useInterviewById(id);
  const interview = interviewQuery.data;

  // Recruiter name memo
  const recruiterName = useMemo(() => {
    if (!interview?.recruiter) return t("recruiter");
    return [interview.recruiter.firstName, interview.recruiter.lastName]
      .filter(Boolean)
      .join(" ") || t("recruiter");
  }, [interview, t]);

  // Candidate name memo
  const candidateName = useMemo(() => {
    if (!interview?.candidate) return t("candidate");
    return [interview.candidate.firstName, interview.candidate.lastName]
      .filter(Boolean)
      .join(" ") || t("candidate");
  }, [interview, t]);

  if (!id || !isUuid(id)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-sm font-semibold text-rose-700 text-center shadow-xs">
          {t("invalidLink")}
        </p>
      </div>
    );
  }

  if (interviewQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-3">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-10 w-44 animate-pulse rounded bg-slate-200" />
          </div>

          {/* Double Column Layout Skeleton */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="flex gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
                <div className="h-6.5 w-20 animate-pulse rounded-full bg-slate-50" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-28 animate-pulse rounded-2xl bg-slate-50" />
                <div className="h-28 animate-pulse rounded-2xl bg-slate-50" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100/50" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100/50" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100/50" />
              </div>
            </div>
            <div className="h-64 animate-pulse rounded-3xl border border-slate-200/60 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-sm font-semibold text-rose-700 text-center shadow-xs">
          {t("notFound")}
        </p>
      </div>
    );
  }

  const location = [interview.jobOffer?.city, interview.jobOffer?.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Breadcrumbs/Workspace Panel */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-6">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-lg bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>{t("candidateWorkspace")}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {t("interviewDetails")}
            </h1>
          </div>

          <Link href="/dashboard/candidate/interviews" className="inline-flex">
            <Button variant="outline" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs">
              <ArrowLeft className="h-4 w-4 text-slate-400" />
              {t("backToInterviews")}
            </Button>
          </Link>
        </div>

        {/* Double Column Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main detailed view */}
          <main className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {/* Status & Type Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                  STATUS_CONFIGS[interview.status]?.colorClass || "bg-slate-100 text-slate-700"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", STATUS_CONFIGS[interview.status]?.dotColor || "bg-slate-400")} />
                <span>{t.has(`status.${interview.status}`) ? t(`status.${interview.status}`) : interview.status}</span>
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
                  TYPE_CONFIGS[interview.interviewType]?.colorClass || "bg-slate-100 text-slate-700"
                )}
              >
                {(() => {
                  const Icon = TYPE_CONFIGS[interview.interviewType]?.icon || CalendarDays;
                  return <Icon className="h-3.5 w-3.5 shrink-0" />;
                })()}
                <span>{t.has(`interviewType.${interview.interviewType}`) ? t(`interviewType.${interview.interviewType}`) : interview.interviewType}</span>
              </span>
            </div>

            {/* Title & Scheduled Time Card */}
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {interview.title}
              </h2>
              <p className="mt-2.5 inline-flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                <span>{formatDateTime(interview.scheduledAt)}</span>
              </p>
            </div>

            {/* Recruiter & Job Info Double Pod */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Recruiter profile pod */}
              <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("assignedRecruiter")}
                </p>
                <div className="mt-3.5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 font-bold text-white shadow-sm text-sm">
                    {getInitials(recruiterName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {recruiterName}
                    </p>
                    {interview.recruiter?.email ? (
                      <a
                        href={`mailto:${interview.recruiter.email}`}
                        className="mt-1 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors break-all"
                      >
                        <Mail className="h-3.5 w-3.5 text-indigo-400" />
                        {interview.recruiter.email}
                      </a>
                    ) : (
                      <p className="text-xs text-slate-400">{t("noEmailShared")}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Offer Info Pod */}
              <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("jobOffering")}
                </p>
                <div className="mt-3.5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 shadow-xs">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {interview.jobOffer?.title ?? t("jobOffering")}
                    </p>
                    {location ? (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {location}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">{t("remoteNoLocation")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Duration / Type / Invitation Grid */}
            <div className="grid gap-4 sm:grid-cols-3 bg-slate-50/40 rounded-2xl p-4 border border-slate-100">
              <div className="bg-white border border-slate-200/50 rounded-xl p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("duration")}
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Clock3 className="h-4.5 w-4.5 text-indigo-500" />
                  {t("durationMinutes", { minutes: interview.duration })}
                </p>
              </div>

              <div className="bg-white border border-slate-200/50 rounded-xl p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("interviewTypeLabel")}
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-800 capitalize">
                  {(() => {
                    const Icon = TYPE_CONFIGS[interview.interviewType]?.icon || CalendarDays;
                    return <Icon className="h-4.5 w-4.5 text-indigo-500 shrink-0" />;
                  })()}
                  {t.has(`interviewType.${interview.interviewType}`) ? t(`interviewType.${interview.interviewType}`) : interview.interviewType.toLowerCase()}
                </p>
              </div>

              <div className="bg-white border border-slate-200/50 rounded-xl p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("invitationStatus")}
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span className={cn("h-1.5 w-1.5 rounded-full", interview.sendInvitation ? "bg-emerald-500" : "bg-slate-400")} />
                  {interview.sendInvitation ? t("emailCalendarSent") : t("manualFollowUp")}
                </p>
              </div>
            </div>

            {/* Recruiter Message callout */}
            {interview.message ? (
              <div className="relative overflow-hidden rounded-2xl border-l-4 border-indigo-500 bg-indigo-50/15 p-5 border border-indigo-100/50">
                <div className="absolute right-4 top-4 text-indigo-100/30">
                  <MessageSquare className="h-10 w-10 rotate-12 stroke-[1.5]" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-2 inline-flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t("recruiterInvitationNote")}
                </p>
                <p className="relative text-sm leading-relaxed font-medium text-slate-700 whitespace-pre-wrap pr-10">
                  {interview.message}
                </p>
              </div>
            ) : null}

            {/* Candidate Internal Notes callout (amber warning style) */}
            {interview.notes ? (
              <div className="relative overflow-hidden rounded-2xl border-l-4 border-amber-500 bg-amber-50/20 p-5 border border-amber-100/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">
                  {t("sessionPreparationNotes")}
                </p>
                <p className="relative text-sm leading-relaxed font-medium text-amber-900 whitespace-pre-wrap">
                  {interview.notes}
                </p>
              </div>
            ) : null}
          </main>

          {/* Sidebar candidate identity view */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm self-start space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t("candidateProfile")}
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-900 truncate">
                {candidateName}
              </h2>
            </div>

            <div className="space-y-4">
              {interview.candidate?.email ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {t("emailAddress")}
                    </p>
                    <a
                      href={`mailto:${interview.candidate.email}`}
                      className="text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors truncate block"
                    >
                      {interview.candidate.email}
                    </a>
                  </div>
                </div>
              ) : null}

              {interview.candidate?.phone ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {t("phoneNumber")}
                    </p>
                    <a
                      href={`tel:${interview.candidate.phone}`}
                      className="text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors truncate block"
                    >
                      {interview.candidate.phone}
                    </a>
                  </div>
                </div>
              ) : null}

              {interview.candidate?.address ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {t("location")}
                    </p>
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {interview.candidate.address}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
