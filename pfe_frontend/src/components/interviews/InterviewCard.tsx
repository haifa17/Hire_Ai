"use client";

import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Clock3,
  MapPin,
  MessageSquare,
  Video,
  Phone,
} from "lucide-react";
import { useMemo } from "react";
import type { Interview } from "@/domain/models/Interview";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type InterviewCardProps = Readonly<{
  interview: Interview;
  href: string;
  role: "candidate" | "recruiter";
  actionLabel?: string;
  actionHref?: string;
}>;

interface StatusConfig {
  label: string;
  dotColor: string;
  colorClass: string;
}

const STATUS_CONFIGS: Record<Interview["status"], StatusConfig> = {
  SCHEDULED: {
    label: "Scheduled",
    dotColor: "bg-blue-500",
    colorClass: "bg-blue-50 text-blue-700 ring-blue-600/15",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    dotColor: "bg-amber-500",
    colorClass: "bg-amber-50 text-amber-700 ring-amber-600/15",
  },
  COMPLETED: {
    label: "Completed",
    dotColor: "bg-emerald-500",
    colorClass: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  },
  CANCELLED: {
    label: "Cancelled",
    dotColor: "bg-rose-500",
    colorClass: "bg-rose-50 text-rose-700 ring-rose-600/15",
  },
};

interface TypeConfig {
  label: string;
  icon: typeof Video | typeof Phone | typeof Building2;
  colorClass: string;
}

const TYPE_CONFIGS: Record<Interview["interviewType"], TypeConfig> = {
  VIDEO: {
    label: "Video Interview",
    icon: Video,
    colorClass: "bg-purple-50 text-purple-700 ring-purple-600/10",
  },
  ONSITE: {
    label: "On-site Interview",
    icon: Building2,
    colorClass: "bg-cyan-50 text-cyan-700 ring-cyan-600/10",
  },
  PHONE: {
    label: "Phone Interview",
    icon: Phone,
    colorClass: "bg-teal-50 text-teal-700 ring-teal-600/10",
  },
};

function getFullName(person?: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "Unknown"
  );
}

function getInitials(name: string) {
  if (!name || name === "Unknown") return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getInterviewLocation(interview: Interview) {
  if (!interview.jobOffer?.city && !interview.jobOffer?.country) return null;
  return [interview.jobOffer?.city, interview.jobOffer?.country]
    .filter(Boolean)
    .join(", ");
}

export function InterviewCard({
  interview,
  href,
  role,
  actionLabel = "Open Details",
  actionHref,
}: InterviewCardProps) {
  const counterpartLabel = role === "candidate" ? "Recruiter" : "Candidate";
  const counterpart =
    role === "candidate"
      ? getFullName(interview.recruiter)
      : getFullName(interview.candidate);
  const location = getInterviewLocation(interview);
  const actionTarget = actionHref ?? href;

  // Custom date and time parsing for visual layout
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(interview.scheduledAt));
    } catch {
      return "Invalid date";
    }
  }, [interview.scheduledAt]);

  const formattedTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(interview.scheduledAt));
    } catch {
      return "";
    }
  }, [interview.scheduledAt]);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Status & Type Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                STATUS_CONFIGS[interview.status].colorClass
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", STATUS_CONFIGS[interview.status].dotColor)} />
              <span>{STATUS_CONFIGS[interview.status].label}</span>
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
                TYPE_CONFIGS[interview.interviewType].colorClass
              )}
            >
              {(() => {
                const Icon = TYPE_CONFIGS[interview.interviewType].icon;
                return <Icon className="h-3.5 w-3.5 shrink-0" />;
              })()}
              <span>{TYPE_CONFIGS[interview.interviewType].label}</span>
            </span>
          </div>

          {/* Title & Scheduled Time */}
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              {interview.title}
            </h3>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50/70 border border-slate-100 px-3 py-1.5 rounded-xl">
              <CalendarDays className="h-4 w-4 text-indigo-500" />
              <span>{formattedDate} {formattedTime ? `at ${formattedTime}` : ""}</span>
            </p>
          </div>

          {/* Detailed Info Pod Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-slate-50/40 rounded-2xl p-4 border border-slate-100">
            {/* Counterpart (Candidate / Recruiter) */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 font-bold text-white shadow-sm text-xs">
                {getInitials(counterpart)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {counterpartLabel}
                </p>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {counterpart}
                </p>
              </div>
            </div>

            {/* Job Title */}
            {interview.jobOffer?.title ? (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 border border-slate-200/60 shadow-xs">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Job Offer
                  </p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {interview.jobOffer.title}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Duration */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 border border-slate-200/60 shadow-xs">
                <Clock3 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Duration
                </p>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {interview.duration} mins
                </p>
              </div>
            </div>

            {/* Location */}
            {location ? (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 border border-slate-200/60 shadow-xs">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {location}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Invitation Message bubble */}
          {interview.message ? (
            <div className="relative overflow-hidden rounded-2xl border-l-4 border-indigo-500 bg-indigo-50/15 p-4 border border-indigo-100/50">
              <div className="absolute right-4 top-4 text-indigo-100/30">
                <MessageSquare className="h-8 w-8 rotate-12 stroke-[1.5]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5 inline-flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Invitation note
              </p>
              <p className="relative text-sm text-slate-600 leading-relaxed font-medium line-clamp-3 whitespace-pre-wrap pr-10">
                {interview.message}
              </p>
            </div>
          ) : null}
        </div>

        {/* Buttons and actions column */}
        <div className="flex shrink-0 flex-col gap-3 lg:items-end lg:justify-between lg:self-stretch">
          <div className="flex flex-wrap gap-2.5 lg:flex-col lg:items-end">
            {actionLabel ? (
              <Link href={actionTarget} className="inline-flex w-full sm:w-auto">
                <Button className="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-sm shadow-indigo-100 hover:shadow-md transition-all duration-200">
                  {actionLabel}
                </Button>
              </Link>
            ) : null}
            
          </div>

          <div className="hidden lg:inline-flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <CalendarDays className="h-3.5 w-3.5 text-indigo-400/80" />
            <span>Interview Round</span>
          </div>
        </div>
      </div>
    </article>
  );
}
