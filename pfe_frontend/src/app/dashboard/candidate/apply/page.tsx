"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  CloudUpload,
  FileText,
  Globe,
  MapPin,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePublicJobOfferById } from "@/features/jobs/hooks/useJobOffers";
import type { JobOffer } from "@/domain/models/JobOffer";
import type { Job } from "@/domain/models/Job";
import { useJobStore } from "@/store/useJobStore";
import { useResumeStore } from "@/store/useResumeStore";
import type { ResumeData } from "@/services/resumeService";
import {
  buildMatchingPreviewRequest,
  extractMatchingScore,
} from "@/services/ai/matching";

function formatEmploymentType(value: JobOffer["employmentType"]): string {
  return formatEnumLabel(value);
}

function formatWorkplaceType(value: JobOffer["workplaceType"]): string {
  return formatEnumLabel(value);
}

function formatEnumLabel(value: string): string {
  if (value === "CDD") return "CDD";
  if (value === "CDI") return "CDI";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/gi, "")
    .replace(/\s+/g, " ");
}

function extractResumeText(resume: ResumeData | null): string {
  if (!resume) return "";

  const contentText =
    typeof resume.content === "string"
      ? resume.content
      : JSON.stringify(resume.content ?? {});

  return `${resume.title} ${resume.language} ${contentText}`.toLowerCase();
}

function computeFitScore(job: JobOffer, resume: ResumeData | null): number {
  if (!resume) return 82;

  const resumeText = extractResumeText(resume);
  const pool = [...job.requiredSkills, ...job.preferredSkills];
  const overlap = pool.filter((skill) =>
    resumeText.includes(normalizeToken(skill)),
  ).length;

  const titleBoost =
    /full stack|frontend|backend|react|node|typescript|system design/i.test(
      resume.title,
    )
      ? 8
      : 0;

  return Math.min(98, Math.max(72, 74 + overlap * 6 + titleBoost));
}

function mapEmploymentTypeToJobType(
  employmentType: JobOffer["employmentType"],
): Job["type"] {
  switch (employmentType) {
    case "FULL_TIME":
      return "FULL_TIME";
    case "PART_TIME":
      return "PART_TIME";
    case "CONTRACT":
    case "CDD":
    case "CDI":
      return "CONTRACT";
    default:
      return "INTERNSHIP";
  }
}

function buildJobStorePayload(job: JobOffer, matchScore: number): Job {
  return {
    id: job.id,
    title: job.title,
    companyName: job.company?.name ?? "Unknown company",
    location: `${job.city}, ${job.country}`,
    type: mapEmploymentTypeToJobType(job.employmentType),
    salaryRange:
      job.salaryMin && job.salaryMax
        ? `${job.currency} ${Number(job.salaryMin).toLocaleString()} - ${Number(job.salaryMax).toLocaleString()}`
        : undefined,
    description: job.description,
    requirements: job.requirements,
    postedAt: job.createdAt,
    matchScore,
  };
}

function useDropzoneHandlers({
  inputRef,
  setIsDragging,
  onFiles,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  setIsDragging: (value: boolean) => void;
  onFiles: (files: File[]) => void;
}) {
  return {
    onClick: () => inputRef.current?.click(),
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(event.dataTransfer.files ?? []);
      if (droppedFiles.length === 0) return;
      onFiles(droppedFiles);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      inputRef.current?.click();
    },
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      if (selectedFiles.length === 0) return;
      onFiles(selectedFiles);
    },
  };
}

async function runMatchPreview({
  job,
  resume,
  fallbackScore,
  isActive,
  signal,
  onScore,
  onDone,
}: {
  job: JobOffer;
  resume: ResumeData;
  fallbackScore: number;
  isActive: () => boolean;
  signal: AbortSignal;
  onScore: (score: number) => void;
  onDone: () => void;
}): Promise<void> {
  try {
    const response = await api.post(
      "/applications/match-preview",
      buildMatchingPreviewRequest(job, resume, "en"),
      { timeout: 25_000, signal },
    );

    const previewScore = extractMatchingScore(response.data);
    if (isActive() && previewScore > 0) {
      onScore(previewScore);
    }
  } catch {
    if (isActive()) onScore(fallbackScore);
  } finally {
    if (isActive()) onDone();
  }
}

function resolveApplicationSubmitError(
  error: unknown,
  t: (key: string) => string,
): { message: string; existingAppId?: string } {
  const axiosError = error as {
    response?: { data?: { message?: string; existingApplicationId?: string } };
    message?: string;
  };
  const errData = axiosError?.response?.data;
  const rawMessage = errData?.message || axiosError?.message || t("genericError");
  const message = typeof rawMessage === "string" ? rawMessage : t("alreadyApplied");
  return { message, existingAppId: errData?.existingApplicationId };
}

function UploadedFileCard({
  file,
  label,
  removeLabel,
  onRemove,
}: Readonly<{
  file: File;
  label: string;
  removeLabel: string;
  onRemove: () => void;
}>) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {file.name}
          </div>
          <div className="text-xs text-slate-500">
            {label} · {Math.max(1, Math.round(file.size / 1024))} KB
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        aria-label={removeLabel}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ApplyPageClient() {
  const t = useTranslations("candidateDashboard.apply");
  const router = useRouter();
  const search = useSearchParams();
  const jobId = search?.get("jobId") ?? "";
  const resumeQueryId = search?.get("resumeId") ?? "";
  const cvInputRef = useRef<HTMLInputElement | null>(null);
  const coverLetterInputRef = useRef<HTMLInputElement | null>(null);
  const supportingInputRef = useRef<HTMLInputElement | null>(null);

  const jobQueryById = usePublicJobOfferById(jobId);
  const jobQuery = jobQueryById;
  const { saveJob } = useJobStore();
  const { resumes, fetchResumes, loading: resumesLoading } = useResumeStore();

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [isDraggingCv, setIsDraggingCv] = useState(false);
  const [isDraggingCoverLetter, setIsDraggingCoverLetter] = useState(false);
  const [isDraggingSupporting, setIsDraggingSupporting] = useState(false);
  const [matchScore, setMatchScore] = useState(0);

  useEffect(() => {
    void fetchResumes();
  }, [fetchResumes]);

  useEffect(() => {
    if (!jobId) return;
    api
      .get("/applications/me")
      .then((res) => {
        const myApps = res.data?.data ?? res.data ?? [];
        const existingApp = myApps.find(
          (app: { id: string; jobOfferId: string }) => app.jobOfferId === jobId,
        );
        if (existingApp?.id) {
          toast.error(t("alreadyApplied"));
          router.replace(`/dashboard/candidate/applications/${existingApp.id}`);
        }
      })
      .catch(() => {});
  }, [jobId, router]);

  useEffect(() => {
    const applyResumeQueryId = () => {
      if (resumeQueryId) {
        setSelectedResumeId(resumeQueryId);
      }
    };
    applyResumeQueryId();
  }, [resumeQueryId]);

  useEffect(() => {
    const applyDefaultResume = () => {
      if (!selectedResumeId && resumes.length > 0) {
        setSelectedResumeId(resumes[0].id);
      }
    };
    applyDefaultResume();
  }, [resumes, selectedResumeId]);

  const job = jobQuery.data ?? null;
  const selectedResume = useMemo(
    () => resumes.find((resume) => resume.id === selectedResumeId) ?? null,
    [resumes, selectedResumeId],
  );
  const jobStorePayload = useMemo(
    () => (job ? buildJobStorePayload(job, matchScore) : null),
    [job, matchScore],
  );
  const companyName = job?.company?.name ?? t("hiringTeam");
  const companyLogo = job?.company?.logoUrl ?? null;

  useEffect(() => {
    if (!job) {
      const resetMatchState = () => {
        setMatchScore(0);
      };
      resetMatchState();
      return;
    }

    const fallbackScore = computeFitScore(job, selectedResume);

    if (!selectedResume) {
      const applyFallbackOnly = () => {
        setMatchScore(fallbackScore);
      };
      applyFallbackOnly();
      return;
    }

    const controller = new AbortController();
    let active = true;
    const applyFallbackScore = () => setMatchScore(fallbackScore);
    applyFallbackScore();

    void runMatchPreview({
      job,
      resume: selectedResume,
      fallbackScore,
      isActive: () => active,
      signal: controller.signal,
      onScore: setMatchScore,
      onDone: () => {},
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [job, selectedResume]);

  const handleCvFile = (nextFile: File) => {
    if (nextFile.type !== "application/pdf") {
      toast.error(t("cvMustBePdf"));
      return;
    }

    setCvFile(nextFile);
    setProgress(null);
  };

  const handleCoverLetterFile = (nextFile: File) => {
    if (nextFile.type !== "application/pdf") {
      toast.error(t("coverLetterMustBePdf"));
      return;
    }

    setCoverLetterFile(nextFile);
  };

  const handleSupportingFiles = (nextFiles: File[]) => {
    const allowedMimes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/pjpeg",
      "image/png",
      "image/webp",
    ]);

    const validFiles = nextFiles.filter((nextFile) => {
      const valid = allowedMimes.has(nextFile.type);
      if (!valid) {
        toast.error(t("unsupportedFileType", { fileName: nextFile.name }));
      }
      return valid;
    });

    setSupportingFiles((current) => {
      const availableSlots = Math.max(0, 5 - current.length);
      const filesToAdd = validFiles.slice(0, availableSlots);

      if (validFiles.length > filesToAdd.length) {
        toast.error(t("maxSupportingDocuments"));
      }

      return [...current, ...filesToAdd];
    });
  };

  const removeSupportingFile = (indexToRemove: number) => {
    setSupportingFiles((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    if (!jobId) {
      toast.error(t("missingJobSelection"));
      return;
    }

    if (!cvFile) {
      toast.error(t("uploadCvRequired"));
      return;
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
      const form = new FormData();
      form.append("jobOfferId", jobId);
      if (coverLetterFile) {
        form.append("coverLetter", coverLetterFile);
      }
      form.append("cv", cvFile);
      supportingFiles.forEach((supportingFile) => {
        form.append("supportingDocuments", supportingFile);
      });

      const response = await api.post("/applications", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setProgress(percent);
        },
      });

      const applicationData = response.data?.data ?? response.data;
      const applicationId = applicationData?.id;

      toast.success(t("applicationSubmitted"));
      if (applicationId) {
        router.push(`/dashboard/candidate/applications/${applicationId}`);
      } else {
        router.push("/dashboard/candidate/applications");
      }
    } catch (error: unknown) {
      const { message, existingAppId } = resolveApplicationSubmitError(error, t);

      toast.error(message);

      if (existingAppId) {
        router.push(`/dashboard/candidate/applications/${existingAppId}`);
        return;
      }

      if (message.includes("already applied")) {
        try {
          const myAppsRes = await api.get("/applications/me");
          const myApps = myAppsRes.data?.data ?? myAppsRes.data ?? [];
          const match = myApps.find(
            (app: { id: string; jobOfferId: string }) => app.jobOfferId === jobId,
          );
          if (match?.id) {
            router.push(`/dashboard/candidate/applications/${match.id}`);
            return;
          }
        } catch {
          router.push("/dashboard/candidate/applications");
        }
      }
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  const cvDropzone = useDropzoneHandlers({
    inputRef: cvInputRef,
    setIsDragging: setIsDraggingCv,
    onFiles: (files) => handleCvFile(files[0]),
  });
  const coverLetterDropzone = useDropzoneHandlers({
    inputRef: coverLetterInputRef,
    setIsDragging: setIsDraggingCoverLetter,
    onFiles: (files) => handleCoverLetterFile(files[0]),
  });
  const supportingDropzone = useDropzoneHandlers({
    inputRef: supportingInputRef,
    setIsDragging: setIsDraggingSupporting,
    onFiles: handleSupportingFiles,
  });

  const handleSaveJob = () => {
    if (!jobStorePayload) return;

    saveJob(jobStorePayload);
    toast.success(t("jobSaved"));
  };

  if (!jobId) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-[#f5f7fb] p-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{t("missingJobTitle")}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {t("missingJobMessage")}
          </p>
          <Button className="mt-6" onClick={() => router.back()}>
            {t("goBack")}
          </Button>
        </div>
      </div>
    );
  }

  if (jobQuery.isLoading || resumesLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-[#f5f7fb] px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-20 animate-pulse rounded-3xl bg-slate-200/80" />
          <div className="h-52 animate-pulse rounded-3xl bg-slate-200/80" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-56 animate-pulse rounded-3xl bg-slate-200/80" />
            <div className="h-56 animate-pulse rounded-3xl bg-slate-200/80" />
          </div>
        </div>
      </div>
    );
  }

  if (jobQuery.isError || !job) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-[#f5f7fb] p-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("jobNotFoundTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t("jobNotFoundMessage")}
          </p>
          <Link href="/dashboard/candidate/jobs" className="mt-6 inline-flex">
            <Button>{t("browseJobs")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f5f7fb] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link
            href="/dashboard/candidate/jobs"
            className="transition hover:text-slate-900"
          >
            {t("breadcrumbJobs")}
          </Link>
          <span>›</span>
          <span>{companyName}</span>
          <span>›</span>
          <span className="text-slate-900">{t("breadcrumbApply")}</span>
        </div>

        <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-sm">
              {companyLogo ? (
                <Image
                  src={companyLogo}
                  alt={companyName}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="text-lg font-semibold">
                  {companyName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight text-slate-950 md:text-[30px]">
                {job.title}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {companyName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.city}, {job.country}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  {formatWorkplaceType(job.workplaceType)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="h-4 w-4" />
                  {formatEmploymentType(job.employmentType)}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-slate-200 bg-white shadow-none"
            onClick={handleSaveJob}
            type="button"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {t("saveJob")}
          </Button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. PRIMARY RESUME (CV) SECTION (REQUIRED) */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div>
              <h3 className="text-base font-semibold text-slate-950 md:text-lg">
                {t("cvResumeRequired")}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {t("cvResumeHint")}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <button
                type="button"
                className={cn(
                  "group relative flex min-h-42.5 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-slate-50 px-6 py-8 text-center transition hover:border-emerald-300 hover:bg-emerald-50/60",
                  isDraggingCv
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200",
                )}
                onClick={cvDropzone.onClick}
                onDragOver={cvDropzone.onDragOver}
                onDragLeave={cvDropzone.onDragLeave}
                onDrop={cvDropzone.onDrop}
                onKeyDown={cvDropzone.onKeyDown}
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition group-hover:text-emerald-500">
                  <CloudUpload className="h-7 w-7" />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {t("uploadCvResume")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {t("cvUploadHint")}
                </div>
                <input
                  ref={cvInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={cvDropzone.onChange}
                />
              </button>

              {cvFile ? (
                <UploadedFileCard
                  file={cvFile}
                  label={t("primaryCv")}
                  removeLabel={t("removeUploadedCv")}
                  onRemove={() => setCvFile(null)}
                />
              ) : (
                <div className="flex min-h-16 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-center text-xs font-medium text-slate-500">
                  {t("cvUploadRequiredHint")}
                </div>
              )}
            </div>
          </section>

          {/* 2. COVER LETTER & SUPPORTING DOCUMENTS SECTION (OPTIONAL) */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div>
              <h3 className="text-base font-semibold text-slate-950 md:text-lg">
                {t("coverLetterSectionTitle")}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {t("coverLetterSectionHint")}
              </p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* Cover Letter Dropzone */}
              <button
                type="button"
                className={cn(
                  "group relative flex min-h-42.5 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-slate-50 px-6 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50/60",
                  isDraggingCoverLetter
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200",
                )}
                onClick={coverLetterDropzone.onClick}
                onDragOver={coverLetterDropzone.onDragOver}
                onDragLeave={coverLetterDropzone.onDragLeave}
                onDrop={coverLetterDropzone.onDrop}
                onKeyDown={coverLetterDropzone.onKeyDown}
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition group-hover:text-blue-500">
                  <CloudUpload className="h-7 w-7" />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {t("uploadCoverLetterDocument")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {t("coverLetterUploadHint")}
                </div>
                <input
                  ref={coverLetterInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={coverLetterDropzone.onChange}
                />
              </button>

              {/* Supporting Documents Dropzone */}
              <button
                type="button"
                className={cn(
                  "group relative flex min-h-42.5 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-slate-50 px-6 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50/60",
                  isDraggingSupporting
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200",
                )}
                onClick={supportingDropzone.onClick}
                onDragOver={supportingDropzone.onDragOver}
                onDragLeave={supportingDropzone.onDragLeave}
                onDrop={supportingDropzone.onDrop}
                onKeyDown={supportingDropzone.onKeyDown}
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition group-hover:text-blue-500">
                  <CloudUpload className="h-7 w-7" />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {t("uploadSupportingDocuments")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {t("supportingDocumentsUploadHint")}
                </div>
                <input
                  ref={supportingInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={supportingDropzone.onChange}
                />
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  {t("coverLetterPdf")}
                </h4>
                {coverLetterFile ? (
                  <UploadedFileCard
                    file={coverLetterFile}
                    label={t("coverLetterLabel")}
                    removeLabel={t("removeUploadedFile")}
                    onRemove={() => setCoverLetterFile(null)}
                  />
                ) : (
                  <div className="flex min-h-24 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                    {t("noCoverLetterUploaded")}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  {t("additionalSupportingFiles")}
                </h4>
                {supportingFiles.length > 0 ? (
                  <div className="space-y-2">
                    {supportingFiles.map((supportingFile, index) => (
                      <UploadedFileCard
                        key={`${supportingFile.name}-${supportingFile.lastModified}-${index}`}
                        file={supportingFile}
                        label={t("supportingLabel")}
                        removeLabel={t("removeUploadedFile")}
                        onRemove={() => removeSupportingFile(index)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-24 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                    {t("noSupportingDocumentsUploaded")}
                  </div>
                )}
              </div>
            </div>

            {progress === null ? null : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>{t("uploading")}</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                {t("infoSharedSecurely", { companyName })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="border-slate-200 bg-white"
                  onClick={() => router.back()}
                  type="button"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-blue-600 text-white shadow-[0_14px_40px_-18px_rgba(37,99,235,0.7)] hover:bg-blue-700"
                >
                  {t("submitApplication")}
                </Button>
              </div>
            </div>
          </section>
        </form>

        <div className="pb-6 text-center text-xs text-slate-400">
          <ChevronDown className="mx-auto mb-1 h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
