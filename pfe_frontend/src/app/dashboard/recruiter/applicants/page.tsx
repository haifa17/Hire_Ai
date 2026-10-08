"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  CalendarDays,
  FileText,
  Mail,
  AlertTriangle,
  Users,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useJobOfferById } from "@/features/jobs/hooks/useJobOffers";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ApplicantsFilter,
  ApplicationStatus,
  APPLICATION_STATUS_OPTIONS,
} from "@/components/applications/ApplicantsFilter";

type ApplicantSummary = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
};

type JobApplicationRow = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  cvUrl?: string | null;
  candidate: ApplicantSummary;
  aiAnalysis?: {
    matchPercentage?: number;
    matchScore?: number;
    overallMatch?: number;
    score?: number;
    atsScore?: number;
    globalScore?: number;
    summary?: string;
    candidateSummary?: string;
    // Unified 7-criterion breakdown (0-1 fractions, `null`/absent when a
    // criterion couldn't be evaluated).
    breakdown?: {
      skills?: number | null;
      experience?: number | null;
      semantic?: number | null;
      education?: number | null;
      projects?: number | null;
      languages?: number | null;
      certifications?: number | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};

function normalizeApplicantsResponse(payload: unknown): JobApplicationRow[] {
  if (Array.isArray(payload)) {
    return payload as JobApplicationRow[];
  }

  if (payload && typeof payload === "object") {
    const response = payload as { data?: unknown; items?: unknown };

    if (Array.isArray(response.data)) {
      return response.data as JobApplicationRow[];
    }

    if (Array.isArray(response.items)) {
      return response.items as JobApplicationRow[];
    }
  }

  return [];
}

function getStatusStyles(status: ApplicationStatus) {
  switch (status) {
    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100/60";
    case "INTERVIEW":
      return "bg-blue-50 text-blue-700 ring-blue-600/20 hover:bg-blue-100/60";
    case "SHORTLISTED":
      return "bg-purple-50 text-purple-700 ring-purple-600/20 hover:bg-purple-100/60";
    case "REVIEWED":
      return "bg-amber-50 text-amber-700 ring-amber-600/20 hover:bg-amber-100/60";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 ring-rose-600/20 hover:bg-rose-100/60";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-600/10 hover:bg-slate-100/60";
  }
}

function formatApplicantName(candidate: ApplicantSummary, unknownLabel: string) {
  const parts = [candidate.firstName, candidate.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : unknownLabel;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName, lastName].filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length > 0) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return "?";
}

function resolveFileUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  return `${baseUrl}${url}`;
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: "statusLabels.pending",
  REVIEWED: "statusLabels.reviewed",
  SHORTLISTED: "statusLabels.shortlisted",
  INTERVIEW: "statusLabels.interview",
  ACCEPTED: "statusLabels.accepted",
  REJECTED: "statusLabels.rejected",
};

export default function RecruiterApplicantsPage() {
  const t = useTranslations("recruiterDashboard.applicants");
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";
  const [apps, setApps] = useState<JobApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">(
    "ALL",
  );
  const [updatingMap, setUpdatingMap] = useState<Record<string, boolean>>({});

  const jobQuery = useJobOfferById(jobId);

  const jobSummary = useMemo(() => {
    const job = jobQuery.data;
    if (!job) return null;

    return {
      title: job.title,
      company: job.company?.name ?? t("jobSummary.unknownCompany"),
      location: `${job.city}, ${job.country}`,
      applicationsCount: job.applicationsCount,
    };
  }, [jobQuery.data]);

  const handleDownload = (url: string) => {
    const resolvedUrl = resolveFileUrl(url);
    if (!resolvedUrl) return;
    window.open(resolvedUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!jobId) {
      const clearApps = () => {
        setApps([]);
        setError(null);
        setLoading(false);
      };
      clearApps();
      return;
    }

    const startLoading = () => {
      setError(null);
      setLoading(true);
    };
    startLoading();
    api
      .get(`/applications/job/${jobId}`)
      .then((response) => setApps(normalizeApplicantsResponse(response.data)))
      .catch((error) =>
        setError(error?.response?.data?.message || error.message),
      )
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleInlineStatusUpdate = async (
    applicationId: string,
    newStatus: ApplicationStatus,
  ) => {
    setUpdatingMap((prev) => ({ ...prev, [applicationId]: true }));
    try {
      await api.patch(`/applications/${applicationId}/status`, {
        status: newStatus,
      });

      setApps((prevApps) =>
        prevApps.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app,
        ),
      );
      toast.success(t("toast.statusUpdated", { status: newStatus }));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg =
        axiosError?.response?.data?.message ||
        axiosError.message ||
        t("toast.statusUpdateFailed");
      toast.error(errorMsg);
    } finally {
      setUpdatingMap((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  const handleRowRematch = async (applicationId: string) => {
    setUpdatingMap((prev) => ({ ...prev, [applicationId]: true }));
    try {
      const response = await api.get(`/applications/${applicationId}/match-score?force=true`, {
        timeout: 120000, // 2 minutes timeout for the heavy AI matching task
      });
      const updatedAnalysis = response.data?.data ?? response.data;
      setApps((prevApps) =>
        prevApps.map((app) =>
          app.id === applicationId ? { ...app, aiAnalysis: updatedAnalysis } : app,
        ),
      );
      toast.success(t("toast.matchRecalculated"));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(axiosError?.response?.data?.message || axiosError.message || t("toast.matchRecalculateFailed"));
    } finally {
      setUpdatingMap((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  // Live filtered applicants
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && app.status !== statusFilter) {
        return false;
      }
      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = formatApplicantName(app.candidate, t("unknownCandidate")).toLowerCase();
        const email = (app.candidate.email ?? "").toLowerCase();
        if (!fullName.includes(q) && !email.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [apps, statusFilter, searchQuery]);

  // Live KPI metrics computed from loaded applicants list
  const stats = useMemo(() => {
    const total = apps.length;
    const shortlisted = apps.filter(
      (a) => a.status === "SHORTLISTED" || a.status === "REVIEWED",
    ).length;
    const interview = apps.filter((a) => a.status === "INTERVIEW").length;
    const decided = apps.filter(
      (a) => a.status === "ACCEPTED" || a.status === "REJECTED",
    ).length;

    return { total, shortlisted, interview, decided };
  }, [apps]);

  // Computed counts for each status to display in the filter dropdown
  const statusCounts = useMemo(() => {
    const counts: Record<ApplicationStatus | "ALL", number> = {
      ALL: apps.length,
      PENDING: 0,
      REVIEWED: 0,
      SHORTLISTED: 0,
      INTERVIEW: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };

    apps.forEach((app) => {
      if (app.status in counts) {
        counts[app.status]++;
      }
    });

    return counts;
  }, [apps]);

  if (!jobId) {
    return (
      <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden pb-16">
        {/* Glowing background */}
        <div
          className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center"
          aria-hidden="true"
        >
          <div
            className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-20"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 mb-2">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
                <span>{t("workspace")}</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {t("heading")}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {t("subtitle")}
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-8 text-center shadow-xl mt-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 shadow-sm mb-5">
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {t("selectJob.title")}
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              {t("selectJob.description")}
            </p>
            <div className="mt-8">
              <Link href="/dashboard/recruiter/jobs" className="w-full block">
                <Button
                  variant="primary"
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 border-none text-white shadow-md hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 cursor-pointer"
                >
                  {t("selectJob.goToListings")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden pb-16">
        <div
          className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center"
          aria-hidden="true"
        >
          <div
            className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-20"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl space-y-8 animate-pulse">
          {/* Workspace Header Skeleton */}
          <header className="flex flex-col gap-5 border-b border-slate-200/60 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="h-6 w-36 rounded-full bg-slate-200" />
              <div className="h-8 w-80 rounded bg-slate-200" />
              <div className="h-4 w-96 rounded bg-slate-100" />
            </div>
            <div className="h-20 w-80 rounded-2xl bg-slate-200/60" />
          </header>

          {/* KPI metrics row skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl border border-slate-200/30 bg-slate-200/50"
              />
            ))}
          </div>

          {/* Controls skeleton */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div className="h-12 w-96 rounded-2xl bg-slate-200" />
            <div className="h-10 w-80 rounded-xl bg-slate-100" />
          </div>

          {/* Table skeleton */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md shadow-md">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="h-12 px-6"></th>
                  <th className="h-12 px-6"></th>
                  <th className="h-12 px-6"></th>
                  <th className="h-12 px-6"></th>
                  <th className="h-12 px-6"></th>
                  <th className="h-12 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-200">
                {[1, 2, 3, 4, 5].map((index) => (
                  <tr key={`app-skeleton-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 rounded bg-slate-200" />
                          <div className="h-3 w-20 rounded bg-slate-100" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4.5 w-40 rounded bg-slate-100" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-7 w-24 rounded-full bg-slate-100" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-24 rounded bg-slate-100" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-8 w-24 rounded bg-slate-100" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex gap-2">
                        <div className="h-8 w-24 rounded bg-slate-100" />
                        <div className="h-8.5 w-20 rounded bg-slate-50" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden pb-16">
        <div
          className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center"
          aria-hidden="true"
        >
          <div
            className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-20"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 mb-2">
                <span>{t("workspace")}</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {t("heading")}
              </h1>
            </div>
          </header>

          <div className="mx-auto max-w-md w-full rounded-3xl border border-rose-200/50 bg-white/80 backdrop-blur-md p-8 text-center shadow-xl mt-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 shadow-sm mb-5">
              <AlertTriangle className="h-8 w-8 animate-bounce" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {t("loadError.title")}
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              {error}
            </p>
            <div className="mt-8">
              <Link href="/dashboard/recruiter/jobs" className="w-full block">
                <Button
                  variant="outline"
                  className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-all duration-200 cursor-pointer"
                >
                  {t("loadError.backToJobs")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden pb-16">
      {/* Background glow decorator */}
      <div
        className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center"
        aria-hidden="true"
      >
        <div
          className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-20"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Workspace Header and Job summary */}
        <header className="flex flex-col gap-5 border-b border-slate-200/60 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 mb-2">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span>{t("workspace")}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {t("heading")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t("subtitleWithJob")}
            </p>
          </div>

          {jobSummary ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-4 shadow-sm min-w-[320px] lg:max-w-md animate-fade-in">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {jobSummary.title}
                </h3>
                <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                  {jobSummary.company}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
                  {jobSummary.location}
                </p>
              </div>
              <div className="rounded-lg bg-indigo-50/80 px-2.5 py-1 text-right shrink-0">
                <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                  {t("jobSummary.apps")}
                </div>
                <div className="text-sm font-black text-indigo-800">
                  {jobSummary.applicationsCount}
                </div>
              </div>
            </div>
          ) : null}
        </header>

        {/* Dynamic KPI Stats Row */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Applicants */}
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 duration-300" />
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 group-hover:scale-105 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {stats.total}
                </p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {t("kpis.totalCandidates")}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Under Review */}
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 h-16 w-16 bg-purple-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 duration-300" />
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 border border-purple-100 text-purple-600 group-hover:scale-105 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {stats.shortlisted}
                </p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {t("kpis.underReview")}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Interview Phase */}
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 duration-300" />
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 group-hover:scale-105 transition-transform">
                <span className="relative flex h-5 w-5">
                  {stats.interview > 0 && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  )}
                  <CalendarDays className="relative h-5 w-5 text-blue-600" />
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {stats.interview}
                </p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {t("kpis.interviewStage")}
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Decided Phase */}
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 duration-300" />
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {stats.decided}
                </p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {t("kpis.decisionsMade")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters Segment Control Panel */}
        {/* Search and Filters Segment Control Panel */}
        <ApplicantsFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statusCounts={statusCounts}
        />

        {/* Pipeline Table / Empty Container */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md shadow-md transition-all duration-300 hover:shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">{t("table.candidate")}</th>
                  <th className="px-6 py-4">{t("table.email")}</th>
                  <th className="px-6 py-4">{t("table.statusTransition")}</th>
                  <th className="px-6 py-4">{t("table.appliedOn")}</th>
                  <th className="px-6 py-4">{t("table.aiMatch")}</th>
                  <th className="px-6 py-4">{t("table.cv")}</th>
                  <th className="px-6 py-4 text-right">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white/40">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-16 text-center text-slate-500 font-medium"
                      colSpan={6}
                    >
                      <div className="mx-auto max-w-md py-4 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-3 border border-slate-150">
                          <Users className="h-5 w-5" />
                        </div>
                        <h4 className="text-slate-900 font-bold text-base">
                          {t("empty.title")}
                        </h4>
                        <p className="text-slate-400 text-xs mt-1">
                          {t("empty.description")}
                        </p>
                        {(searchQuery || statusFilter !== "ALL") && (
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("ALL");
                            }}
                            className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                          >
                            {t("empty.resetFilters")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}

                {filteredApps.map((application) => (
                  <tr
                    key={application.id}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {application.candidate.photoUrl ? (
                          <Image
                            src={resolveFileUrl(application.candidate.photoUrl)}
                            alt={formatApplicantName(application.candidate, t("unknownCandidate"))}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/10 shadow-sm"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 font-bold text-white shadow-sm text-xs">
                            {getInitials(
                              application.candidate.firstName,
                              application.candidate.lastName,
                            )}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">
                            {formatApplicantName(application.candidate, t("unknownCandidate"))}
                          </div>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                            {t("table.idPrefix", { id: application.id.slice(0, 8) })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium text-xs">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100/50">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {application.candidate.email ?? "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative inline-block text-left">
                        <select
                          value={application.status}
                          onChange={(e) =>
                            handleInlineStatusUpdate(
                              application.id,
                              e.target.value as ApplicationStatus,
                            )
                          }
                          disabled={updatingMap[application.id]}
                          className={cn(
                            "appearance-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 pr-8 text-xs font-bold ring-1 ring-inset cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
                            getStatusStyles(application.status),
                          )}
                        >
                          {APPLICATION_STATUS_OPTIONS.map((opt) => (
                            <option
                              key={opt}
                              value={opt}
                              className="bg-white text-slate-800 font-medium"
                            >
                              {STATUS_LABEL_KEYS[opt] ? t(STATUS_LABEL_KEYS[opt]) : opt}
                            </option>
                          ))}
                        </select>
                        {updatingMap[application.id] ? (
                          <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-slate-500 pointer-events-none" />
                        ) : (
                          <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-current pointer-events-none opacity-80" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium text-xs">
                       <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                        }).format(new Date(application.createdAt))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap relative group/score">
                      {(() => {
                        const score = (() => {
                          const a = application.aiAnalysis;
                          if (a && typeof a === "object") {
                            const v = a.globalScore ?? a.score ?? a.matchScore ?? a.matchPercentage ?? a.atsScore;
                            if (typeof v === "number") return Math.round(v);
                            if (typeof v === "string") return Math.round(Number.parseFloat(v) || 0);
                          }
                          return null;
                        })();
                        
                        if (score === null) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400 font-semibold italic">{t("aiMatch.pending")}</span>
                              <button
                                onClick={() => handleRowRematch(application.id)}
                                disabled={updatingMap[application.id]}
                                className="p-1 rounded-md text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer border border-transparent hover:border-indigo-100"
                                title={t("aiMatch.runScoreTitle")}
                              >
                                {updatingMap[application.id] ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          );
                        }
                        
                        const breakdown = application.aiAnalysis?.breakdown || {};
                        const summary = application.aiAnalysis?.summary ?? application.aiAnalysis?.candidateSummary ?? "";

                        // Unified breakdown fields are 0-1 fractions, or `null`
                        // when a criterion couldn't be evaluated (missing
                        // requirement/data) — never coerce `null` to a fake 0.
                        const toPct = (v: unknown): number | null =>
                          typeof v === "number" ? Math.round(v * 100) : null;

                        const popoverItems = [
                          { label: t("aiMatch.breakdown.requiredSkills"), val: toPct(breakdown.skills), color: "bg-blue-500" },
                          { label: t("aiMatch.breakdown.experienceRelevance"), val: toPct(breakdown.experience), color: "bg-emerald-500" },
                          { label: t("aiMatch.breakdown.semanticSimilarity"), val: toPct(breakdown.semantic), color: "bg-pink-500" },
                          { label: t("aiMatch.breakdown.educationMatch"), val: toPct(breakdown.education), color: "bg-purple-500" },
                          { label: t("aiMatch.breakdown.projectsFit"), val: toPct(breakdown.projects), color: "bg-indigo-500" },
                        ];

                        return (
                          <div className="flex items-center gap-1.5 cursor-help">
                            <span className="font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 text-xs shadow-3xs transition-all duration-205 group-hover/score:bg-emerald-100/70 group-hover/score:scale-105">
                              {score}%
                            </span>
                            
                            {/* Hover Card */}
                            <div className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-80 scale-95 opacity-0 pointer-events-none group-hover/score:scale-100 group-hover/score:opacity-100 group-hover/score:pointer-events-auto transition-all duration-200 ease-out z-50 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-4 shadow-xl text-left">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                                <span className="font-black text-slate-800 text-xs flex items-center gap-1">
                                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                                  {t("aiMatch.insightsTitle")}
                                </span>
                                <span className="font-extrabold text-emerald-650 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  {score}%
                                </span>
                              </div>
                              
                              <div className="space-y-2.5 text-[11px] mb-3">
                                {popoverItems.map((item) => (
                                  <div key={item.label} className="space-y-1">
                                    <div className="flex justify-between text-slate-650 font-semibold">
                                      <span>{item.label}</span>
                                      <span className="font-extrabold text-slate-900">
                                        {item.val === null ? t("aiMatch.notEvaluated") : `${item.val}%`}
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                      <div className={cn("h-full rounded-full transition-all duration-350", item.color)} style={{ width: `${item.val ?? 0}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {summary && (
                                <div className="border-t border-slate-100 pt-2.5 mt-2.5">
                                  <p className="text-[10px] text-slate-500 leading-relaxed italic font-medium">
                                    &quot;{summary.length > 120 ? summary.slice(0, 117) + '...' : summary}&quot;
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {application.cvUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownload(application.cvUrl ?? "")
                          }
                          className="group gap-2 border-slate-200 text-slate-700 hover:bg-white hover:text-slate-950 shadow-2xs transition-all duration-200 cursor-pointer"
                        >
                          <FileText className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform duration-200" />
                          {t("cv.openCv")}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold italic">
                          {t("cv.noCvUploaded")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingMap[application.id]}
                          onClick={() => handleRowRematch(application.id)}
                          className="gap-1 text-indigo-650 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all duration-200 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {t("actions.rematch")}
                        </Button>
                        <Link
                          href={`/dashboard/recruiter/applicants/${application.id}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-indigo-100 hover:bg-indigo-50/50 hover:border-indigo-200 text-indigo-700 transition-all duration-200 shadow-2xs cursor-pointer"
                          >
                            {t("actions.viewDetails")}
                          </Button>
                        </Link>
                        <Link
                          href={`/dashboard/recruiter/interviews/schedule?applicationId=${application.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 cursor-pointer"
                          >
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {t("actions.schedule")}
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
