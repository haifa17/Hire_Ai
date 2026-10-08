"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useJobOfferById } from "@/features/jobs/hooks/useJobOffers";
import { Button } from "@/components/ui/Button";
import { JobDetailsActions } from "@/components/job-offers/JobDetailsActions";
import { PublishButton } from "@/components/job-offers/PublishButton";
import {
  Building2,
  CalendarDays,
  Globe,
  MapPin,
  DollarSign,
  Users,
  Briefcase,
  Award,
  Languages,
  ArrowLeft,
  Eye,
  Check,
  ChevronRight,
  Sparkles,
  Heart,
  Clock,
  TrendingUp,
  FileText,
  Lock,
  Mail,
  AlertCircle,
  UserRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobOffer } from "@/domain/models/JobOffer";

type Translator = ReturnType<typeof useTranslations>;

// Formatters for job fields
function formatSalary(
  job: Pick<JobOffer, "salaryMin" | "salaryMax" | "currency">,
  t: Translator,
): string {
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

function formatEmploymentType(type: string | undefined, t: Translator): string {
  if (!type) return t("notSpecified");
  const map: Record<string, string> = {
    FULL_TIME: t("employmentType.FULL_TIME"),
    PART_TIME: t("employmentType.PART_TIME"),
    CONTRACT: t("employmentType.CONTRACT"),
    CDD: t("employmentType.CDD"),
    CDI: t("employmentType.CDI"),
    TEMPORARY: t("employmentType.TEMPORARY"),
    INTERNSHIP: t("employmentType.INTERNSHIP"),
    FREELANCE: t("employmentType.FREELANCE"),
  };
  return map[type] || type;
}

function formatWorkplaceType(type: string | undefined, t: Translator): string {
  if (!type) return t("notSpecified");
  const map: Record<string, string> = {
    ONSITE: t("workplaceType.ONSITE"),
    HYBRID: t("workplaceType.HYBRID"),
    REMOTE: t("workplaceType.REMOTE"),
  };
  return map[type] || type;
}

function formatExperienceLevel(level: string | undefined, t: Translator): string {
  if (!level) return t("notSpecified");
  const map: Record<string, string> = {
    ENTRY: t("experienceLevel.ENTRY"),
    JUNIOR: t("experienceLevel.JUNIOR"),
    MID: t("experienceLevel.MID"),
    SENIOR: t("experienceLevel.SENIOR"),
    LEAD: t("experienceLevel.LEAD"),
    EXECUTIVE: t("experienceLevel.EXECUTIVE"),
  };
  return map[level] || level;
}

export default function RecruiterJobDetailsPage() {
  const t = useTranslations("recruiterDashboard.jobDetail");
  const params = useParams() as { id?: string };
  const id = params?.id ?? "";
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const query = useJobOfferById(id);

  const job = useMemo(() => query.data, [query.data]);

  // Calculate attraction/conversion rate of the job (moved up to comply with Rules of Hooks)
  const conversionRate = useMemo(() => {
    if (!job) return 0;
    const views = job.views ?? 0;
    const apps = job.applicationsCount ?? 0;
    if (views === 0) return 0;
    return Math.min(100, Math.round((apps / views) * 100));
  }, [job]);

  // High-fidelity shimmer skeleton loading state
  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8 animate-pulse">
        {/* Back Button Skeleton */}
        <div className="h-10 w-36 rounded-xl bg-slate-200" />

        {/* Hero Section Skeleton */}
        <div className="rounded-3xl bg-slate-200 h-44 w-full p-6 md:p-8" />

        {/* Analytics Band Skeleton */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200" />
          ))}
        </div>

        {/* Grid Layout Skeleton */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="h-7 w-48 rounded bg-slate-200" />
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="h-6 w-32 rounded bg-slate-200" />
            <div className="h-20 rounded bg-slate-100" />
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("notFound.title")}</h1>
        <p className="mt-2 text-slate-600">
          {t("notFound.description")}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/dashboard/recruiter/jobs">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToJobs")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const companyLogoUrl = job.company?.logoUrl?.startsWith("/")
    ? `${apiBaseUrl}${job.company.logoUrl}`
    : job.company?.logoUrl;

  const recruiterName =
    `${job.recruiter?.firstName ?? ""} ${job.recruiter?.lastName ?? ""}`.trim();

  // Dynamic style mappings for job statuses
  const getStatusBannerStyles = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
          badge: "bg-emerald-500/20 text-emerald-700 border-emerald-300",
          label: t("status.PUBLISHED"),
          icon: <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
        };
      case "CLOSED":
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          badge: "bg-slate-200/75 text-slate-600 border-slate-300",
          label: t("status.CLOSED"),
          icon: <Lock className="h-3.5 w-3.5" />
        };
      default: // DRAFT
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200/80",
          badge: "bg-amber-100 text-amber-700 border-amber-300",
          label: t("status.DRAFT"),
          icon: <Clock className="h-3.5 w-3.5" />
        };
    }
  };

  const statusStyles = getStatusBannerStyles(job.status);

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Back navigation & header actions */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/recruiter/jobs" className="group">
            <Button variant="outline" size="sm" className="border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-200 bg-white">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              {t("backToJobs")}
            </Button>
          </Link>
        </div>

        {/* Status Header Banner */}
        <div className={cn(
          "rounded-3xl border p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm transition-all bg-white relative overflow-hidden"
        )}>
          <div className="space-y-3 max-w-3xl">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                statusStyles.badge
              )}>
                {statusStyles.icon}
                {statusStyles.label}
              </span>
              {job.urgent && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 border border-rose-500/20 uppercase tracking-wider">
                  {t("urgent")}
                </span>
              )}
              {job.featured && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 uppercase tracking-wider">
                  {t("featured")}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {job.title}
            </h1>

            {/* Header info */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-700">{job.company?.name}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{job.city}, {job.country}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>{t("postedOn", { date: new Date(job.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) })}</span>
              </span>
            </div>
          </div>

          {/* DRAFT state quick publish callout in header */}
          {job.status === "DRAFT" && (
            <div className="flex-shrink-0 bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="text-center sm:text-left space-y-0.5 max-w-[200px]">
                <p className="text-xs font-bold text-amber-900">{t("publishDraft.title")}</p>
                <p className="text-xs text-amber-800/80 leading-snug">{t("publishDraft.description")}</p>
              </div>
              <PublishButton
                jobOfferId={job.id}
                onPublished={() => {
                  query.refetch();
                }}
              />
            </div>
          )}
        </div>

        {/* Analytics KPIs Band */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* Card: Total Views */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("stats.totalViews")}</p>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{job.views ?? 0}</h3>
              <p className="text-xs text-slate-500">{t("stats.totalViewsHint")}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
              <Eye className="h-6 w-6" />
            </div>
          </div>

          {/* Card: Total Applications */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("stats.applications")}</p>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{job.applicationsCount ?? 0}</h3>
              <p className="text-xs text-slate-500">{t("stats.applicationsHint")}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0">
              <FileText className="h-6 w-6" />
            </div>
          </div>

          {/* Card: Attraction / Conversion Rate */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("stats.attractionRate")}</p>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{conversionRate}%</h3>
              <p className="text-xs text-slate-500">{t("stats.attractionRateHint")}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* AI Recommendations CTA */}
        {job.status === "PUBLISHED" && (
          <Link href={`/dashboard/recruiter/jobs/${job.id}/recommendations`}>
            <div className="mb-8 rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm group-hover:shadow-md transition-shadow">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t("aiCta.title")}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("aiCta.description")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        )}

        {/* Double Column Core Content */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left Column: Job detail sections */}
          <div className="space-y-6">
            {/* Card: About this role */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t("sections.aboutRole")}</h2>
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
                  <h2 className="text-xl font-bold text-slate-900">{t("sections.responsibilities")}</h2>
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
                  <h2 className="text-xl font-bold text-slate-900">{t("sections.requirements")}</h2>
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

            {/* Card: Required & Preferred Skills */}
            {(job.requiredSkills.length > 0 || (job.preferredSkills && job.preferredSkills.length > 0)) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
                {job.requiredSkills.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      {t("sections.requiredSkills")}
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

                {job.preferredSkills && job.preferredSkills.length > 0 && (
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      {t("sections.preferredSkills")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {job.preferredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 transition-all duration-200 cursor-default"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Card: Languages */}
            {job.languages && job.languages.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <Languages className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{t("sections.languages")}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.languages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded-xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 cursor-default flex items-center gap-1.5"
                    >
                      <Languages className="h-3.5 w-3.5 text-emerald-600" />
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Card: Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                    <Heart className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{t("sections.benefits")}</h2>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {job.benefits.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm font-medium text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Card: Application Deadline */}
            {job.deadline && (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 flex items-start gap-4 shadow-sm">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-950">{t("sections.applicationDeadline")}</h3>
                  <p className="mt-1 text-sm text-amber-800 leading-relaxed font-semibold">
                    {new Date(job.deadline).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky actions & profile details */}
          <div className="space-y-6">
            {/* Card: Company Quick Profile */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("sidebar.companyProfile")}
              </h3>

              <div className="flex items-center gap-3">
                {companyLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={companyLogoUrl}
                    alt={job.company?.name ?? t("sidebar.companyLogoAlt")}
                    className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-700">
                    {job.company?.name?.charAt(0) ?? "C"}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-800 leading-tight">{job.company?.name}</h4>
                  {job.company?.industry && (
                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                      {job.company.industry}
                    </p>
                  )}
                </div>
              </div>

              {job.company?.companySize && (
                <div className="text-xs bg-slate-50 border border-slate-100 text-slate-600 px-3 py-2 rounded-xl inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t("sidebar.companySize", { size: job.company.companySize })}</span>
                </div>
              )}

              {job.company?.description && (
                <p className="text-xs leading-relaxed text-slate-600 italic border-l-2 border-slate-200 pl-3 line-clamp-4">
                  &ldquo;{job.company.description}&rdquo;
                </p>
              )}
            </div>

            {/* Card: Recruiter profile */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("sidebar.postedBy")}
              </h3>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-800">{recruiterName || t("sidebar.recruiter")}</h4>
                  {job.recruiter?.email && (
                    <a
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                      href={`mailto:${job.recruiter.email}`}
                    >
                      <Mail className="h-3 w-3" />
                      {job.recruiter.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Card: Key facts */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("sidebar.keyDetails")}
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex-shrink-0">
                    <DollarSign className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t("sidebar.salary")}</p>
                    <p className="text-xs font-bold text-slate-800">{formatSalary(job, t)}</p>
                  </div>
                </li>

                <li className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/50 flex-shrink-0">
                    <Briefcase className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t("sidebar.contract")}</p>
                    <p className="text-xs font-bold text-slate-800">{formatEmploymentType(job.employmentType, t)}</p>
                  </div>
                </li>

                <li className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100/50 flex-shrink-0">
                    <Globe className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t("sidebar.workplace")}</p>
                    <p className="text-xs font-bold text-slate-800">{formatWorkplaceType(job.workplaceType, t)}</p>
                  </div>
                </li>

                <li className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100/50 flex-shrink-0">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t("sidebar.experience")}</p>
                    <p className="text-xs font-bold text-slate-800">{formatExperienceLevel(job.experienceLevel, t)}</p>
                  </div>
                </li>

                <li className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100/50 flex-shrink-0">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t("sidebar.openings")}</p>
                    <p className="text-xs font-bold text-slate-800">{t("openings", { count: job.openings })}</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Sidebar actions: Edit / Delete */}
            <div className="bg-slate-100/75 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <JobDetailsActions job={job} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
