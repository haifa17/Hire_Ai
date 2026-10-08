"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { ArrowLeft, AlertTriangle, Settings } from "lucide-react";
import { CandidateSummaryCard } from "@/components/interviews/CandidateSummaryCard";
import { ScheduleInterviewForm } from "@/components/interviews/ScheduleInterviewForm";
import type { ScheduleInterviewValues } from "@/features/interviews/schemas/interviewSchema";
import { useCreateInterview } from "@/features/interviews/hooks/useInterviews";
import api from "@/lib/api";
import { interviewService } from "@/services/interviewService";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";

interface CandidateDetails {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  candidateProfile?: {
    professionalSummary?: string;
    skills?: unknown;
  };
}

interface ApplicationDetails {
  id: string;
  aiAnalysis?: {
    matchPercentage?: number;
    matchScore?: number;
    overallMatch?: number;
    score?: number;
    atsScore?: number;
  } | null;
  candidate?: CandidateDetails;
  jobOffer?: {
    id: string;
    title?: string;
  };
}

function extractSkills(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value).trim())
      .filter(Boolean);
  }

  return [];
}

function extractMatchScore(analysis: unknown): number {
  if (analysis && typeof analysis === "object") {
    const record = analysis as Record<string, unknown>;
    const raw =
      record.matchPercentage ??
      record.matchScore ??
      record.overallMatch ??
      record.score ??
      record.atsScore;

    if (typeof raw === "number") {
      return Math.max(0, Math.min(100, Math.round(raw)));
    }

    if (typeof raw === "string") {
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
  }

  return 0;
}

function extractInterviewId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as { id?: unknown; data?: unknown };

  if (typeof response.id === "string" && response.id.length > 0) {
    return response.id;
  }

  if (response.data && typeof response.data === "object") {
    const nested = response.data as { id?: unknown };

    if (typeof nested.id === "string" && nested.id.length > 0) {
      return nested.id;
    }
  }

  return null;
}

export default function ScheduleInterviewPage() {
  const t = useTranslations("recruiterDashboard.interviewSchedule");
  const searchParams = useSearchParams();
  const router = useRouter();
  const createInterview = useCreateInterview();
  const recruiter = useAuthStore((state) => state.user);

  const applicationId = searchParams.get("applicationId") ?? "";
  const [selectedDate, setSelectedDate] = useState<string>();

  const applicationQuery = useQuery({
    queryKey: ["application", applicationId],
    queryFn: async () => {
      const response = await api.get(`/applications/${applicationId}`);
      return (response.data?.data ?? response.data) as ApplicationDetails;
    },
    enabled: !!applicationId,
  });

  const availabilityQuery = useQuery({
    queryKey: ["recruiter-availability", recruiter?.id, selectedDate],
    queryFn: async () => {
      if (!recruiter?.id || !selectedDate) return { busySlots: [] };

      const from = new Date(`${selectedDate}T00:00:00`).toISOString();
      const to = new Date(`${selectedDate}T23:59:59`).toISOString();
      return interviewService.getRecruiterAvailability(recruiter.id, {
        from,
        to,
      });
    },
    enabled: !!recruiter?.id && !!selectedDate,
  });

  const candidate = applicationQuery.data?.candidate;
  const jobOffer = applicationQuery.data?.jobOffer;

  const fullName = useMemo(() => {
    const parts = [candidate?.firstName, candidate?.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : t("defaultCandidateName");
  }, [candidate?.firstName, candidate?.lastName, t]);

  const matchScore = extractMatchScore(applicationQuery.data?.aiAnalysis);
  const skills = extractSkills(candidate?.candidateProfile?.skills);

  const handleSubmit = async (values: ScheduleInterviewValues) => {
    if (!candidate?.id || !jobOffer?.id) {
      toast.error(t("toast.missingInfo"));
      return;
    }

    const scheduledAt = new Date(
      `${values.interviewDate}T${values.interviewTime}:00`,
    ).toISOString();

    const interview = await createInterview.mutateAsync({
      title: values.title,
      interviewType: values.interviewType,
      scheduledAt,
      duration: values.duration,
      message: values.message || undefined,
      sendInvitation: values.sendInvitation,
      notes: values.notes || undefined,
      candidateId: candidate.id,
      jobOfferId: jobOffer.id,
    });

    const interviewId = extractInterviewId(interview);

    if (!interviewId) {
      toast.error(t("toast.missingInterviewId"));
      return;
    }

    try {
      await api.patch(`/applications/${applicationId}/status`, {
        status: "INTERVIEW",
      });
    } catch {
      // Non-blocking: interview is scheduled, only status transition failed
    }

    toast.success(t("toast.scheduled"));
    router.push(`/dashboard/recruiter/interviews/${interviewId}`);
  };

  if (!applicationId) {
    return (
      <div className="relative min-h-screen bg-slate-50/70 flex items-center justify-center p-6 overflow-hidden">
        {/* Decorative blurred glow circles */}
        <div className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center" aria-hidden="true">
          <div className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-amber-500 to-orange-600 opacity-20" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
        </div>
        
        <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-8 text-center shadow-xl">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 shadow-sm animate-pulse mb-5">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t("missingContext.title")}</h2>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {t("missingContext.description")}
          </p>
          <div className="mt-8">
            <Link href="/dashboard/recruiter/applicants" className="w-full block">
              <Button variant="primary" className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 border-none text-white shadow-md hover:from-indigo-700 hover:to-blue-700 transition-all duration-200">
                {t("browseApplications")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (applicationQuery.isLoading) {
    return (
      <div className="relative min-h-screen bg-slate-50/50 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow effect in skeleton */}
        <div className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center" aria-hidden="true">
          <div className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-10" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
        </div>

        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-150 pb-6">
            <div className="space-y-3">
              <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-10 w-44 animate-pulse rounded bg-slate-200" />
          </div>

          {/* Grid Skeleton */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="h-[520px] animate-pulse rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md" />
            </div>
            <div className="h-[480px] animate-pulse rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!applicationQuery.data) {
    return (
      <div className="relative min-h-screen bg-slate-50/70 flex items-center justify-center p-6 overflow-hidden">
        {/* Decorative blurred glow circles */}
        <div className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center" aria-hidden="true">
          <div className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-rose-500 to-red-600 opacity-20" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
        </div>

        <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-8 text-center shadow-xl">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 shadow-sm mb-5 animate-bounce">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t("notFound.title")}</h2>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {t("notFound.description")}
          </p>
          <div className="mt-8">
            <Link href="/dashboard/recruiter/applicants" className="w-full block">
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-all duration-200">
                {t("browseApplications")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const busySlots = availabilityQuery.data?.busySlots ?? [];

  return (
    <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden pb-16">
      {/* Decorative blurred glow circles for luxury aesthetic */}
      <div className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center" aria-hidden="true">
        <div className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-20" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Page Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 mb-2">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span>{t("workspaceBadge")}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {t("heading")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t("subtitle")}
            </p>
          </div>

          <Link href={`/dashboard/recruiter/applicants/${applicationId}`} className="inline-flex">
            <Button
              variant="outline"
              className="group gap-2 border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:-translate-x-1 transition-transform duration-200" />
              {t("backToApplication")}
            </Button>
          </Link>
        </header>

        {/* Dual column Scheduler Workspace */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
          
          {/* Left Column: Form Container with Glassmorphism */}
          <div className="space-y-6 rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-6 shadow-md sm:p-8 transition-all duration-300 hover:shadow-lg">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  {t("form.title")}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {t("form.description")}
                </p>
              </div>
            </div>

            <ScheduleInterviewForm
              busySlots={busySlots}
              isSubmitting={createInterview.isPending}
              onDateChange={setSelectedDate}
              onSubmit={handleSubmit}
            />
          </div>

          {/* Right Column: Candidate Profile Snapshot Sidebar */}
          <aside className="sticky top-6">
            <div className="rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md shadow-md p-0.5 hover:shadow-lg transition-all duration-300">
              <CandidateSummaryCard
                fullName={fullName}
                matchScore={matchScore}
                skills={skills}
                email={candidate?.email}
                phone={candidate?.phone}
                location={candidate?.address}
                professionalSummary={
                  candidate?.candidateProfile?.professionalSummary ||
                  t("defaultProfessionalSummary")
                }
                appliedJobTitle={jobOffer?.title}
              />
            </div>
          </aside>
          
        </div>
      </div>
    </div>
  );
}
