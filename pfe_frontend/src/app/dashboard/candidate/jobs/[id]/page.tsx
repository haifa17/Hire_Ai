"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  Globe,
  MapPin,
  Sparkles,
  UserRound,
  Check,
  ChevronRight,
  Eye,
  Users,
  Award,
  Languages,
  Heart,
  Clock,
  Send,
  Target,
  AlertCircle,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePublicJobOfferById } from "@/features/jobs/hooks/useJobOffers";
import { ReportJobModal } from "@/components/job-offers/ReportJobModal";
import type { JobOffer } from "@/domain/models/JobOffer";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Translator = ReturnType<typeof useTranslations>;

// Formatters for job fields
function formatSalary(job: JobOffer, t: Translator): string {
  if (job.salaryMin === undefined || job.salaryMax === undefined) {
    return t("notSpecified");
  }

  if (job.salaryMin === null || job.salaryMax === null) {
    return t("notSpecified");
  }

  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return t("notSpecified");
  }

  return `${job.currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
}

const EMPLOYMENT_TYPE_KEYS = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "CDD",
  "CDI",
  "TEMPORARY",
  "INTERNSHIP",
  "FREELANCE",
];

function formatEmploymentType(type: string | undefined, t: Translator): string {
  if (!type) return t("notSpecified");
  if (EMPLOYMENT_TYPE_KEYS.includes(type)) return t(`employmentTypes.${type}`);
  return type;
}

const WORKPLACE_TYPE_KEYS = ["ONSITE", "HYBRID", "REMOTE"];

function formatWorkplaceType(type: string | undefined, t: Translator): string {
  if (!type) return t("notSpecified");
  if (WORKPLACE_TYPE_KEYS.includes(type)) return t(`workplaceTypes.${type}`);
  return type;
}

const EXPERIENCE_LEVEL_KEYS = ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "EXECUTIVE"];

function formatExperienceLevel(level: string | undefined, t: Translator): string {
  if (!level) return t("notSpecified");
  if (EXPERIENCE_LEVEL_KEYS.includes(level)) return t(`experienceLevels.${level}`);
  return level;
}

export default function CandidateJobDetailsPage() {
  const t = useTranslations("candidateDashboard.jobDetail");
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const jobQuery = usePublicJobOfferById(id);

  const [isSaved, setIsSaved] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const job = useMemo(() => jobQuery.data, [jobQuery.data]);

  // High-fidelity shimmer skeleton loading state
  if (jobQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8 animate-pulse">
        {/* Back Button Skeleton */}
        <div className="h-10 w-36 rounded-xl bg-slate-200" />

        {/* Hero Section Skeleton */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-200 p-8 md:p-10">
          <div className="space-y-4">
            <div className="h-6 w-24 rounded-full bg-slate-300" />
            <div className="h-10 w-2/3 rounded-xl bg-slate-300" />
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="h-5 w-32 rounded bg-slate-300" />
              <div className="h-5 w-40 rounded bg-slate-300" />
              <div className="h-5 w-24 rounded bg-slate-300" />
            </div>
          </div>
        </div>

        {/* Grid Layout Skeleton */}
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main Content Skeleton */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="h-7 w-48 rounded bg-slate-200" />
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-5/6 rounded bg-slate-100" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="h-7 w-40 rounded bg-slate-200" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="h-5 w-5/6 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
              <div className="h-6 w-32 rounded bg-slate-200" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-200 flex-shrink-0" />
                    <div className="space-y-1 w-full">
                      <div className="h-3 w-16 rounded bg-slate-200" />
                      <div className="h-4 w-2/3 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-12 w-full rounded-xl bg-slate-200" />
                <div className="h-12 w-full rounded-xl bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If job offer doesn't exist
  if (!job) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm mb-6">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("jobNotFoundTitle")}</h1>
        <p className="mt-2 text-slate-600">
          {t("jobNotFoundMessage")}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/dashboard/candidate/jobs">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToJobs")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const recruiterName =
    `${job.recruiter?.firstName ?? ""} ${job.recruiter?.lastName ?? ""}`.trim();

  const isUrgent = job.urgent === true;
  const isFeatured = job.featured === true;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Back button & Report button */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/candidate/jobs" className="group">
          <Button variant="outline" size="sm" className="border-slate-200 shadow-sm hover:bg-slate-50 transition-all duration-200">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {t("backToJobs")}
          </Button>
        </Link>

        {/* Top Report Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsReportModalOpen(true)}
          className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 shadow-sm flex items-center gap-1.5"
        >
          <Flag className="h-3.5 w-3.5 text-rose-600" />
          <span>{t("reportThisJob")}</span>
        </Button>
      </div>

      {/* Hero Banner Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-10 shadow-xl border border-slate-800">
        {/* Glow circles */}
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-4 max-w-3xl">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {isUrgent && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/25 text-rose-300 border border-rose-500/30 uppercase tracking-wider animate-pulse">
                  {t("urgent")}
                </span>
              )}
              {isFeatured && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/25 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  {t("featured")}
                </span>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                {formatEmploymentType(job.employmentType, t)}
              </span>
            </div>

            {/* Job Title */}
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {job.title}
            </h1>

            {/* Sub-header metadata row */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                  <Building2 className="h-4 w-4 text-indigo-300" />
                </div>
                <span className="font-medium text-white">{job.company?.name ?? t("companyFallback")}</span>
              </span>

              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{job.city}, {job.country}</span>
              </span>

              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>{t("publishedOn", { date: new Date(job.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) })}</span>
              </span>

              {job.views !== undefined && (
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-slate-400" />
                  <span>{t("viewsCount", { count: job.views })}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Apply CTA in Hero */}
          <div className="flex-shrink-0 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/dashboard/candidate/match?jobId=${job.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Target className="h-4 w-4" />
              {t("checkMatch")}
            </Link>
            <Link href={`/dashboard/candidate/apply?jobId=${job.id}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200">
                <Send className="mr-2 h-4 w-4" />
                {t("applyNow")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left Column - Main Details */}
        <div className="space-y-6">
          {/* Card: Description */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{t("aboutThisRole")}</h2>
            </div>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {job.description}
            </p>
          </div>

          {/* Card: Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t("responsibilities")}</h2>
              </div>
              <ul className="space-y-3">
                {job.responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 border border-sky-100 mt-0.5">
                      <ChevronRight className="h-3 w-3" />
                    </span>
                    <span className="text-sm leading-6 text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card: Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Award className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t("requirements")}</h2>
              </div>
              <ul className="space-y-3">
                {job.requirements.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 mt-0.5">
                      <Check className="h-3.5 w-3.5 font-bold" />
                    </span>
                    <span className="text-sm leading-6 text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card: Required Skills & Languages */}
          {(job.requiredSkills.length > 0 || job.languages.length > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
              {job.requiredSkills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
                    {t("requiredSkills")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-xl border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 transition-all duration-200 cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.languages.length > 0 && (
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <Languages className="h-4 w-4 text-emerald-600" />
                    {t("languages")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.languages.map((language) => (
                      <span
                        key={language}
                        className="rounded-xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition-all duration-200 cursor-default"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card: Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Heart className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t("benefits")}</h2>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {job.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-sm font-medium text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card: Deadline */}
          {job.deadline && (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5 flex items-start gap-4 shadow-sm">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 flex-shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">{t("applicationDeadline")}</h3>
                <p className="mt-1 text-sm text-rose-800 leading-relaxed font-semibold">
                  {new Date(job.deadline).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="mt-0.5 text-xs text-rose-700/80">
                  {t("deadlineHint")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Card: Quick Facts & Actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("quickFacts")}
            </h3>

            <div className="space-y-4">
              {/* Fact: Salary */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-slate-50 hover:border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/55 flex-shrink-0">
                  <span className="font-bold">$</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("salary")}</p>
                  <p className="text-sm font-bold text-slate-800">{formatSalary(job, t)}</p>
                </div>
              </div>

              {/* Fact: Employment Type */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-slate-50 hover:border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/55 flex-shrink-0">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("employmentType")}</p>
                  <p className="text-sm font-bold text-slate-800">{formatEmploymentType(job.employmentType, t)}</p>
                </div>
              </div>

              {/* Fact: Workplace Type */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-slate-50 hover:border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100/55 flex-shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("workplaceType")}</p>
                  <p className="text-sm font-bold text-slate-800">{formatWorkplaceType(job.workplaceType, t)}</p>
                </div>
              </div>

              {/* Fact: Experience */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-slate-50 hover:border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100/55 flex-shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("experienceLevel")}</p>
                  <p className="text-sm font-bold text-slate-800">{formatExperienceLevel(job.experienceLevel, t)}</p>
                </div>
              </div>

              {/* Fact: Openings */}
              {job.openings > 0 && (
                <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-slate-50 hover:border-slate-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100/55 flex-shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("openings")}</p>
                    <p className="text-sm font-bold text-slate-800">{t("openingsCount", { count: job.openings })}</p>
                  </div>
                </div>
              )}

              {/* Fact: Hiring Team contact */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-slate-50 hover:border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100/55 flex-shrink-0">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("hiringContact")}</p>
                  <p className="text-sm font-bold text-slate-800">{recruiterName || t("hiringTeam")}</p>
                </div>
              </div>
            </div>

            {/* Actions: Apply, Save & Report */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <Link href={`/dashboard/candidate/apply?jobId=${job.id}`} className="block w-full">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-300 shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 active:translate-y-0">
                  {t("applyNow")}
                </Button>
              </Link>
              <Button
                variant="outline"
                className={cn(
                  "w-full transition-all duration-200 border-slate-200",
                  isSaved && "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                )}
                onClick={() => setIsSaved(!isSaved)}
              >
                <Heart className={cn("mr-2 h-4 w-4 transition-transform duration-200", isSaved && "fill-rose-500 text-rose-500 scale-110")} />
                {isSaved ? t("saved") : t("saveJob")}
              </Button>

              {/* Report button for candidate */}
              <Button
                variant="outline"
                className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-colors flex items-center justify-center gap-2"
                onClick={() => setIsReportModalOpen(true)}
              >
                <Flag className="h-4 w-4 text-rose-600" />
                <span>{t("reportThisJob")}</span>
              </Button>
            </div>
          </div>

          {/* Card: Company */}
          {job.company && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("aboutTheCompany")}
              </h3>

              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                  {job.company.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 leading-tight">{job.company.name}</h4>
                  {job.company.industry && (
                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                      {job.company.industry}
                    </p>
                  )}
                </div>
              </div>

              {job.company.companySize && (
                <div className="text-xs bg-slate-50 border border-slate-100 text-slate-600 px-3 py-2 rounded-xl inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t("companySizeLabel", { size: job.company.companySize })}</span>
                </div>
              )}

              {job.company.description && (
                <p className="text-xs leading-relaxed text-slate-600 italic border-l-2 border-slate-200 pl-3">
                  &ldquo;{job.company.description}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportJobModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        jobOfferId={job.id}
        jobTitle={job.title}
        recruiterId={job.recruiterId}
      />
    </div>
  );
}
