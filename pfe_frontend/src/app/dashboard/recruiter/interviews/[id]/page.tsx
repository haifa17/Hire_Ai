"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { CandidateSummaryCard } from "@/components/interviews/CandidateSummaryCard";
import { ScheduleInterviewForm } from "@/components/interviews/ScheduleInterviewForm";
import { Button } from "@/components/ui/Button";
import type { ScheduleInterviewValues } from "@/features/interviews/schemas/interviewSchema";
import {
  useDeleteInterview,
  useInterviewById,
  useUpdateInterview,
} from "@/features/interviews/hooks/useInterviews";
import { interviewService } from "@/services/interviewService";
import { useAuthStore } from "@/store/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trash2,
  Info,
  Calendar,
  LayoutDashboard,
  ShieldCheck,
  Settings,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toDateTimeParts(value: string) {
  const date = new Date(value);
  const datePart = date.toISOString().slice(0, 10);
  const timePart = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
  return { datePart, timePart };
}

interface StatusBannerConfig {
  label: string;
  icon: typeof CheckCircle2 | typeof XCircle | typeof Info | typeof Calendar;
  colorClass: string;
  glowClass: string;
  description: string;
}

function useStatusBannerConfigs(): Record<string, StatusBannerConfig> {
  const t = useTranslations("recruiterDashboard.interviewDetail.statusBanner");
  return {
    SCHEDULED: {
      label: t("scheduled.label"),
      icon: Calendar,
      colorClass: "from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/20 text-indigo-950",
      glowClass: "bg-blue-500",
      description: t("scheduled.description"),
    },
    RESCHEDULED: {
      label: t("rescheduled.label"),
      icon: Info,
      colorClass: "from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20 text-amber-950",
      glowClass: "bg-amber-500",
      description: t("rescheduled.description"),
    },
    COMPLETED: {
      label: t("completed.label"),
      icon: CheckCircle2,
      colorClass: "from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20 text-emerald-950",
      glowClass: "bg-emerald-500",
      description: t("completed.description"),
    },
    CANCELLED: {
      label: t("cancelled.label"),
      icon: XCircle,
      colorClass: "from-rose-500/10 via-red-500/5 to-transparent border-rose-500/20 text-rose-950",
      glowClass: "bg-rose-500",
      description: t("cancelled.description"),
    },
  };
}

export default function InterviewDetailsPage() {
  const t = useTranslations("recruiterDashboard.interviewDetail");
  const statusBannerConfigs = useStatusBannerConfigs();
  const params = useParams() as { id?: string };
  const id = params?.id ?? "";
  const router = useRouter();

  const recruiter = useAuthStore((state) => state.user);
  const interviewQuery = useInterviewById(id);
  const updateInterview = useUpdateInterview();
  const deleteInterview = useDeleteInterview();

  const [selectedDate, setSelectedDate] = useState<string>();

  const availabilityQuery = useQuery({
    queryKey: ["recruiter-availability", recruiter?.id, selectedDate, id],
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

  const interview = interviewQuery.data;

  const initialValues = useMemo(() => {
    if (!interview) return undefined;
    const { datePart, timePart } = toDateTimeParts(interview.scheduledAt);

    return {
      title: interview.title,
      interviewType: interview.interviewType,
      interviewDate: datePart,
      interviewTime: timePart,
      duration: interview.duration,
      message: interview.message ?? "",
      sendInvitation: interview.sendInvitation,
      notes: interview.notes ?? "",
    } satisfies Partial<ScheduleInterviewValues>;
  }, [interview]);

  const busySlots = useMemo(() => {
    return (availabilityQuery.data?.busySlots ?? []).filter(
      (slot) => slot.id !== id,
    );
  }, [availabilityQuery.data?.busySlots, id]);

  if (!id || !isUuid(id)) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 text-sm font-semibold text-rose-700 text-center shadow-md backdrop-blur-sm">
          {t("invalidLink")}
        </p>
      </div>
    );
  }

  const handleReschedule = async (values: ScheduleInterviewValues) => {
    const scheduledAt = new Date(
      `${values.interviewDate}T${values.interviewTime}:00`,
    ).toISOString();

    await updateInterview.mutateAsync({
      id,
      data: {
        title: values.title,
        interviewType: values.interviewType,
        scheduledAt,
        duration: values.duration,
        message: values.message || undefined,
        sendInvitation: values.sendInvitation,
        notes: values.notes || undefined,
        status: "RESCHEDULED",
      },
    });

    toast.success(t("toast.updated"));
  };

  const markCompleted = async () => {
    await updateInterview.mutateAsync({ id, data: { status: "COMPLETED" } });
    toast.success(t("toast.markedCompleted"));
  };

  const cancelInterview = async () => {
    await updateInterview.mutateAsync({
      id,
      data: {
        status: "CANCELLED",
        notes: interview?.notes || t("defaultCancelNote"),
      },
    });
    toast.success(t("toast.cancelled"));
  };

  const deleteCurrentInterview = async () => {
    await deleteInterview.mutateAsync(id);
    toast.success(t("toast.deleted"));
    router.push("/dashboard/recruiter");
  };

  if (interviewQuery.isLoading || !initialValues) {
    return (
      <div className="relative min-h-screen bg-slate-50/50 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative blurred glow circles for luxury aesthetic */}
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

          {/* Double Column Layout Skeleton */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              {/* Form Skeleton */}
              <div className="h-[520px] animate-pulse rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md" />
              {/* Actions Skeleton */}
              <div className="h-32 animate-pulse rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-md" />
            </div>
            {/* Candidate Card Skeleton */}
            <div className="h-[480px] animate-pulse rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 text-sm font-semibold text-rose-700 text-center shadow-md backdrop-blur-sm">
          {t("notFound")}
        </p>
      </div>
    );
  }

  const candidateName = [
    interview.candidate?.firstName,
    interview.candidate?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden">
      {/* Decorative blurred glow circles for luxury aesthetic */}
      <div className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center" aria-hidden="true">
        <div className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-20" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Workspace Header */}
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
          </div>

          <Link href="/dashboard/recruiter/interviews" className="inline-flex">
            <Button
              variant="outline"
              className="group gap-2 border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:-translate-x-1 transition-transform duration-200" />
              {t("backToInterviews")}
            </Button>
          </Link>
        </header>

        {/* Status Banner callout */}
        {(() => {
          const config = statusBannerConfigs[interview.status];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <div className={cn(
              "relative overflow-hidden flex items-start gap-4 rounded-2xl border p-5 shadow-sm backdrop-blur-md bg-gradient-to-r transition-all duration-300", 
              config.colorClass
            )}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 border border-slate-200/20 shadow-sm">
                <Icon className="h-5 w-5 animate-pulse text-slate-900" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full animate-ping", config.glowClass)} />
                  <p className="text-xs font-black uppercase tracking-wider">
                    {t("statusLabel", { status: config.label })}
                  </p>
                </div>
                <p className="text-sm font-medium opacity-90 leading-relaxed max-w-4xl">
                  {config.description}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Double Column Management Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Form Section */}
            <div className="rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-6 shadow-md sm:p-8 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    {t("rescheduleSection.title")}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {t("rescheduleSection.description")}
                  </p>
                </div>
              </div>
              
              <ScheduleInterviewForm
                busySlots={busySlots}
                onDateChange={setSelectedDate}
                isSubmitting={updateInterview.isPending}
                initialValues={initialValues}
                onSubmit={handleReschedule}
              />
            </div>

            {/* Actions Management Panel */}
            <div className="rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-6 shadow-md sm:p-8 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">
                    {t("statusPanel.title")}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {t("statusPanel.description")}
                  </p>
                </div>
              </div>

              {interview.status === "COMPLETED" && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 text-xs text-emerald-800">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="font-semibold leading-relaxed">
                    {t("statusPanel.completedNotice")}
                  </span>
                </div>
              )}

              {interview.status === "CANCELLED" && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50/50 border border-rose-100 p-3 text-xs text-rose-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-semibold leading-relaxed">
                    {t("statusPanel.cancelledNotice")}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-4">
                <Button
                  variant="primary"
                  onClick={markCompleted}
                  isLoading={updateInterview.isPending}
                  disabled={interview.status === "COMPLETED"}
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-sm border-none transition-all duration-200"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("statusPanel.markCompleted")}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelInterview}
                  isLoading={updateInterview.isPending}
                  disabled={interview.status === "CANCELLED"}
                  className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                >
                  <XCircle className="h-4 w-4 text-rose-500" />
                  {t("statusPanel.cancelInterview")}
                </Button>
                <Button
                  variant="danger"
                  onClick={deleteCurrentInterview}
                  isLoading={deleteInterview.isPending}
                  className="gap-2 bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-700 hover:to-red-700 border-none shadow-sm transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("statusPanel.deleteInterview")}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Candidate Card Sidebar */}
          <aside className="self-start">
            <div className="rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md shadow-md p-0.5 hover:shadow-lg transition-all duration-300">
              <CandidateSummaryCard
                fullName={candidateName || t("defaultCandidateName")}
                matchScore={85}
                skills={interview.candidate?.address ? ["React", "TypeScript", "Node.js", "System Design"] : []}
                email={interview.candidate?.email}
                phone={interview.candidate?.phone}
                location={interview.candidate?.address}
                appliedJobTitle={interview.jobOffer?.title}
                professionalSummary={t("defaultProfessionalSummary")}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
