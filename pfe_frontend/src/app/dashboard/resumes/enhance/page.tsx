"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Building,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  FileImage,
  Check,
  ArrowRight,
} from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { usePublicJobOffers } from "@/features/jobs/hooks/useJobOffers";
import type { JobOffer } from "@/domain/models/JobOffer";
import type { ResumeTemplateId } from "@/domain/models/ResumeTemplate";
import { ResumeTemplatePicker } from "@/features/resume-templates/components/ResumeTemplatePicker";

type StepNumber = 1 | 2 | 3;
type JobSourceMode = "job-offer" | "manual";

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatJobOfferDescription(jobOffer: JobOffer): string {
  const sections = [
    `Job offer source: ${jobOffer.company?.name ?? "Unknown company"}`,
    `Title: ${jobOffer.title}`,
    `Location: ${jobOffer.location}, ${jobOffer.city}, ${jobOffer.country}`,
    `Employment type: ${jobOffer.employmentType}`,
    `Workplace type: ${jobOffer.workplaceType}`,
    `Experience level: ${jobOffer.experienceLevel}`,
    jobOffer.educationLevel
      ? `Education level: ${jobOffer.educationLevel}`
      : null,
    jobOffer.description ? `Description:\n${jobOffer.description}` : null,
    jobOffer.responsibilities.length > 0
      ? `Responsibilities:\n- ${jobOffer.responsibilities.join("\n- ")}`
      : null,
    jobOffer.requirements.length > 0
      ? `Requirements:\n- ${jobOffer.requirements.join("\n- ")}`
      : null,
    jobOffer.requiredSkills.length > 0
      ? `Required skills:\n- ${jobOffer.requiredSkills.join("\n- ")}`
      : null,
    jobOffer.preferredSkills.length > 0
      ? `Preferred skills:\n- ${jobOffer.preferredSkills.join("\n- ")}`
      : null,
    jobOffer.benefits.length > 0
      ? `Benefits:\n- ${jobOffer.benefits.join("\n- ")}`
      : null,
    jobOffer.languages.length > 0
      ? `Languages:\n- ${jobOffer.languages.join("\n- ")}`
      : null,
  ].filter((section): section is string => Boolean(section));

  return sections.join("\n\n");
}

function renderFileIcon(filename: string, className: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "doc" || ext === "docx") return <FileCode className={className} />;
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return <FileImage className={className} />;
  return <FileText className={className} />;
}

function getStepCardClass(isCurrent: boolean, isCompleted: boolean): string {
  if (isCurrent) return "border-blue-500 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-900/20";
  if (isCompleted) return "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-900/10";
  return "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30";
}

function getStepBadgeClass(isCurrent: boolean, isCompleted: boolean): string {
  if (isCurrent) return "bg-blue-600 text-white shadow-sm";
  if (isCompleted) return "bg-emerald-600 text-white";
  return "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
}

function EnhanceResumeStepper({
  currentStep,
  t,
}: Readonly<{ currentStep: StepNumber; t: ReturnType<typeof useTranslations> }>) {
  const steps = [
    { number: 1, title: t("stepper.step1.title"), desc: t("stepper.step1.desc") },
    { number: 2, title: t("stepper.step2.title"), desc: t("stepper.step2.desc") },
    { number: 3, title: t("stepper.step3.title"), desc: t("stepper.step3.desc") },
  ];

  function getStepLabelClass(isCurrent: boolean, isCompleted: boolean): string {
    if (isCurrent) return "text-blue-600 dark:text-blue-400";
    if (isCompleted) return "text-emerald-600 dark:text-emerald-400";
    return "text-gray-400";
  }

  return (
    <div className="mb-8 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:grid-cols-3">
      {steps.map((step) => {
        const isCurrent = currentStep === step.number;
        const isCompleted = currentStep > step.number;

        return (
          <div
            key={step.number}
            className={`rounded-xl border p-4 transition-all ${getStepCardClass(isCurrent, isCompleted)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${getStepLabelClass(isCurrent, isCompleted)}`}
                >
                  {t("stepper.stepLabel", { number: step.number })}
                </p>
                <h2 className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h2>
              </div>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getStepBadgeClass(isCurrent, isCompleted)}`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.number}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {step.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function EnhanceResumePage() {
  const t = useTranslations("resumesEditor.enhance");
  const router = useRouter();
  const { enhanceResume, enhancingResume, error } = useResumeStore();

  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("EN");
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>("executive");

  const [sourceMode, setSourceMode] = useState<JobSourceMode>("job-offer");
  const [jobSearch, setJobSearch] = useState("");
  const [selectedJobOfferId, setSelectedJobOfferId] = useState("");
  const [manualJobDescription, setManualJobDescription] = useState("");

  const jobOfferFilters = useMemo(
    () => ({
      search: jobSearch.trim() || undefined,
      page: 1,
      limit: 20,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    }),
    [jobSearch]
  );

  const jobOffersQuery = usePublicJobOffers(jobOfferFilters);
  const publishedJobs = useMemo(
    () => jobOffersQuery.data?.items ?? [],
    [jobOffersQuery.data]
  );

  const selectedJobOffer = useMemo(
    () => publishedJobs.find((job) => job.id === selectedJobOfferId) ?? null,
    [publishedJobs, selectedJobOfferId]
  );

  const selectedJobOfferDescription = selectedJobOffer
    ? formatJobOfferDescription(selectedJobOffer)
    : "";

  const validateAndSetFile = (file: File) => {
    setFileError(null);
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      setFileError(t("errors.unsupportedFormat"));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(t("errors.fileTooLarge"));
      return;
    }

    setSelectedFile(file);
    if (!title) {
      const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      setTitle(t("defaultTitle", { name: baseName }));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const isStep1Valid = Boolean(selectedFile);
  const isStep2Valid =
    sourceMode === "job-offer"
      ? selectedJobOfferId.length > 0
      : manualJobDescription.trim().length > 0;
  const isStep3Valid = title.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !isStep1Valid || !isStep2Valid || !isStep3Valid) return;

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title.trim());
      formData.append("language", language);
      formData.append("template", selectedTemplate);

      if (sourceMode === "job-offer") {
        formData.append("jobOfferId", selectedJobOfferId);
      } else {
        formData.append("jobDescription", manualJobDescription.trim());
      }

      const result = await enhanceResume(formData);
      router.push(`/dashboard/resumes/${result.id}`);
    } catch (err) {
      console.error("Failed to enhance resume", err);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <Link
        href="/dashboard/resumes"
        className="mb-6 inline-flex items-center text-gray-500 transition hover:text-blue-600 dark:text-gray-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("backToResumes")}
      </Link>

      <div className="mb-8">
        <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-white">
          <Sparkles className="mr-3 h-8 w-8 text-blue-600" />
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("subtitle")}
        </p>
      </div>

      <EnhanceResumeStepper currentStep={currentStep} t={t} />

      {(error || fileError) && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div>{fileError || error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── STEP 1: Upload File ────────────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  1
                </span>{" "}
                {t("step1.heading")}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-9">
                {t("step1.supportedFormats")}{" "}
                <strong className="text-gray-700 dark:text-gray-300">
                  {t("step1.formatsList")}
                </strong>{" "}
                {t("step1.maxSize")}
              </p>
            </div>

            {!selectedFile ? (
              <div
                role="button"
                tabIndex={0}
                aria-label={t("step1.dropzoneText")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50/50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-750"
                }`}
                onClick={() => document.getElementById("resumeFileInput")?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    document.getElementById("resumeFileInput")?.click();
                  }
                }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mb-4">
                  <Upload className="h-8 w-8" />
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {t("step1.dropzoneText")}{" "}
                  <span className="text-blue-600 hover:underline">
                    {t("step1.browse")}
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {t("step1.dropzoneHint")}
                </p>
                <input
                  id="resumeFileInput"
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900/40 dark:bg-blue-900/20">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    {renderFileIcon(selectedFile.name, "h-6 w-6")}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-md">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("step1.fileSize", {
                        size: (selectedFile.size / (1024 * 1024)).toFixed(2),
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> {t("step1.readyForStep2")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition"
                    title={t("step1.removeFile")}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between border-t border-gray-100 pt-6 dark:border-gray-700">
              <Link
                href="/dashboard/resumes"
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t("step1.cancel")}
              </Link>
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={() => isStep1Valid && setCurrentStep(2)}
                className={`flex items-center rounded-xl px-8 py-3 font-medium text-white transition-all ${
                  !isStep1Valid
                    ? "cursor-not-allowed bg-blue-400 opacity-70"
                    : "bg-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg"
                }`}
              >
                {t("step1.nextButton")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Job Source Selection ───────────────────────────────── */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  2
                </span>{" "}
                {t("step2.heading")}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-9">
                {t("step2.description")}
              </p>
            </div>

            <div className="space-y-5">
              <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/50">
                <button
                  type="button"
                  onClick={() => setSourceMode("job-offer")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    sourceMode === "job-offer"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {t("step2.platformJobOffer")}
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode("manual")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    sourceMode === "manual"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {t("step2.pasteJobDescription")}
                </button>
              </div>

              {sourceMode === "job-offer" ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="jobSearch" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("step2.searchLabel")}
                    </label>
                    <input
                      type="text"
                      id="jobSearch"
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      placeholder={t("step2.searchPlaceholder")}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="jobOfferId" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("step2.selectLabel")}
                    </label>
                    <select
                      id="jobOfferId"
                      value={selectedJobOfferId}
                      onChange={(e) => setSelectedJobOfferId(e.target.value)}
                      className="form-select"
                    >
                      <option value="">{t("step2.selectPlaceholder")}</option>
                      {publishedJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title} - {job.company?.name ?? t("step2.companyFallback")} ({job.city}, {job.country})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedJobOfferDescription && (
                    <div>
                      <label htmlFor="jobOfferDescriptionPreview" className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {t("step2.previewLabel")}
                      </label>
                      <textarea
                        id="jobOfferDescriptionPreview"
                        readOnly
                        rows={6}
                        value={selectedJobOfferDescription}
                        className="form-textarea resize-y"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="manualJobDescription" className="mb-1 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Building className="mr-2 h-4 w-4 text-gray-400" />
                    {t("step2.manualLabel")}
                  </label>
                  <textarea
                    id="manualJobDescription"
                    rows={8}
                    placeholder={t("step2.manualPlaceholder")}
                    value={manualJobDescription}
                    onChange={(e) => setManualJobDescription(e.target.value)}
                    className="form-textarea resize-y"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-gray-100 pt-6 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t("step2.back")}
              </button>
              <button
                type="button"
                disabled={!isStep2Valid}
                onClick={() => isStep2Valid && setCurrentStep(3)}
                className={`flex items-center rounded-xl px-8 py-3 font-medium text-white transition-all ${
                  !isStep2Valid
                    ? "cursor-not-allowed bg-blue-400 opacity-70"
                    : "bg-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg"
                }`}
              >
                {t("step2.nextButton")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Settings, Template & Submit ────────────────────────── */}
        {currentStep === 3 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  3
                </span>{" "}
                {t("step3.heading")}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-9">
                {t("step3.description")}
              </p>
            </div>

            {/* Summary Box */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {t("step3.summaryTitle")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-semibold">{t("step3.fileLabel")}</span> {selectedFile?.name}
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-semibold">{t("step3.targetJobLabel")}</span>{" "}
                  {sourceMode === "job-offer"
                    ? selectedJobOffer?.title ?? t("step3.platformJobFallback")
                    : t("step3.pastedJobFallback")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("step3.titleLabel")}
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("step3.titlePlaceholder")}
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="language" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("step3.languageLabel")}
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="form-select"
                >
                  <option value="EN">{t("step3.languageEnglish")}</option>
                  <option value="FR">{t("step3.languageFrench")}</option>
                </select>
              </div>
            </div>

            <div>
              <span className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("step3.templateLabel")}
              </span>
              <ResumeTemplatePicker
                value={selectedTemplate}
                onChange={setSelectedTemplate}
              />
            </div>

            <div className="flex justify-between border-t border-gray-100 pt-6 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={enhancingResume}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t("step3.back")}
              </button>

              <button
                type="submit"
                disabled={!isStep3Valid || enhancingResume}
                className={`flex items-center justify-center rounded-xl px-8 py-3 font-medium text-white transition-all ${
                  !isStep3Valid || enhancingResume
                    ? "cursor-not-allowed bg-blue-400 opacity-70"
                    : "bg-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg"
                }`}
              >
                {enhancingResume ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    {t("step3.enhancing")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-3 h-5 w-5" />
                    {t("step3.enhanceButton")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
