"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useResumeStore } from "@/store/useResumeStore";
import { ArrowLeft, Loader2, Sparkles, Building, Check } from "lucide-react";
import Link from "next/link";
import { usePublicJobOffers } from "@/features/jobs/hooks/useJobOffers";
import type { JobOffer } from "@/domain/models/JobOffer";
import type { ResumeTemplateId } from "@/domain/models/ResumeTemplate";
import { ResumeTemplatePicker } from "@/features/resume-templates/components/ResumeTemplatePicker";
import type { CreateResumeDto } from "@/services/resumeService";

type ResumeSourceMode = "job-offer" | "manual";
type ResumeCreationStep = 1 | 2;

type ResumeFormData = {
  title: string;
  language: string;
  jobDescription: string;
};

type Step1Summary = {
  title: string;
  language: string;
  jobSourceSummary: string;
};

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

function getJobSourceSummary(
  sourceMode: ResumeSourceMode,
  selectedJobOffer: JobOffer | null,
  jobDescription: string,
  t: ReturnType<typeof useTranslations>,
): string {
  if (sourceMode === "job-offer") {
    if (selectedJobOffer) {
      return `${selectedJobOffer.title} - ${selectedJobOffer.company?.name ?? t("unknownCompany")}`;
    }

    return t("noJobSelected");
  }

  if (jobDescription.trim()) {
    return t("manualJobDescription");
  }

  return t("noDescriptionYet");
}

function ResumeCreationStepper({
  currentStep,
  t,
}: Readonly<{
  currentStep: ResumeCreationStep;
  t: ReturnType<typeof useTranslations>;
}>) {
  return (
    <div className="mb-8 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <div
        className={`rounded-xl border p-4 ${currentStep === 1 ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("stepper.step1Label")}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-gray-900">
              {t("stepper.step1Title")}
            </h2>
          </div>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep === 1 ? "bg-blue-600 text-white" : "bg-white text-gray-400"}`}
          >
            {currentStep === 1 ? "1" : <Check className="h-4 w-4" />}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {t("stepper.step1Description")}
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 ${currentStep === 2 ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("stepper.step2Label")}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-gray-900">
              {t("stepper.step2Title")}
            </h2>
          </div>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep === 2 ? "bg-blue-600 text-white" : "bg-white text-gray-400"}`}
          >
            2
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {t("stepper.step2Description")}
        </p>
      </div>
    </div>
  );
}

function ResumeCreationStepOne({
  formData,
  handleChange,
  generating,
  sourceMode,
  setSourceMode,
  jobSearch,
  setJobSearch,
  selectedJobOfferId,
  setSelectedJobOfferId,
  jobOffersQuery,
  publishedJobs,
  selectedJobOfferDescription,
  canProceedToTemplateStep,
  t,
}: Readonly<{
  formData: ResumeFormData;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  generating: boolean;
  sourceMode: ResumeSourceMode;
  setSourceMode: (mode: ResumeSourceMode) => void;
  jobSearch: string;
  setJobSearch: (value: string) => void;
  selectedJobOfferId: string;
  setSelectedJobOfferId: (value: string) => void;
  jobOffersQuery: ReturnType<typeof usePublicJobOffers>;
  publishedJobs: JobOffer[];
  selectedJobOfferDescription: string;
  canProceedToTemplateStep: boolean;
  t: ReturnType<typeof useTranslations>;
}>) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("step1.titleLabel")}
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            placeholder={t("step1.titlePlaceholder")}
            className="form-input"
            value={formData.title}
            onChange={handleChange}
            disabled={generating}
          />
        </div>

        <div>
          <label
            htmlFor="language"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("step1.languageLabel")}
          </label>
          <select
            id="language"
            name="language"
            required
            className="form-select"
            value={formData.language}
            onChange={handleChange}
            disabled={generating}
          >
            <option value="EN">{t("step1.languageEnglish")}</option>
            <option value="FR">{t("step1.languageFrench")}</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 md:p-5 dark:border-gray-700 dark:bg-gray-900/30">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("step1.jobSourceTitle")}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("step1.jobSourceDescription")}
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setSourceMode("job-offer")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                sourceMode === "job-offer"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {t("step1.existingJob")}
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("manual")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                sourceMode === "manual"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {t("step1.pasteDescription")}
            </button>
          </div>
        </div>

        {sourceMode === "job-offer" ? (
          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="jobSearch"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("step1.searchJobLabel")}
              </label>
              <input
                type="text"
                id="jobSearch"
                value={jobSearch}
                onChange={(event) => setJobSearch(event.target.value)}
                placeholder={t("step1.searchJobPlaceholder")}
                className="form-input"
                disabled={generating}
              />
            </div>

            <div>
              <label
                htmlFor="jobOfferId"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("step1.selectJobLabel")}
              </label>
              <select
                id="jobOfferId"
                name="jobOfferId"
                value={selectedJobOfferId}
                onChange={(event) => setSelectedJobOfferId(event.target.value)}
                className="form-select"
                disabled={generating || jobOffersQuery.isLoading}
              >
                <option value="">{t("step1.selectJobPlaceholder")}</option>
                {publishedJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.company?.name ?? t("unknownCompany")} -{" "}
                    {job.city}, {job.country}
                  </option>
                ))}
              </select>
              {jobOffersQuery.isLoading ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("step1.loadingJobs")}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="jobDescriptionPreview"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("step1.jobDescriptionPreviewLabel")}
              </label>
              <textarea
                id="jobDescriptionPreview"
                readOnly
                rows={12}
                value={selectedJobOfferDescription}
                placeholder={t("step1.jobDescriptionPreviewPlaceholder")}
                className="form-textarea resize-y"
              />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <label
              htmlFor="jobDescription"
              className="mb-2 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <Building className="mr-2 h-4 w-4 text-gray-400" />
              {t("step1.jobDescriptionLabel")}
            </label>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {t("step1.jobDescriptionHint")}
            </p>
            <textarea
              id="jobDescription"
              name="jobDescription"
              required
              rows={12}
              placeholder={t("step1.jobDescriptionPlaceholder")}
              className="form-textarea resize-y"
              value={formData.jobDescription}
              onChange={handleChange}
              disabled={generating}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-700">
        <Link
          href="/dashboard/resumes"
          className="mr-4 rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t("step1.cancel")}
        </Link>

        <button
          type="submit"
          disabled={!canProceedToTemplateStep || generating}
          className={`flex items-center justify-center rounded-xl px-8 py-3 font-medium text-white transition-all ${
            !canProceedToTemplateStep || generating
              ? "cursor-not-allowed bg-blue-400 opacity-70"
              : "bg-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg"
          }`}
        >
          <Sparkles className="mr-3 h-5 w-5" />
          {t("step1.continueButton")}
        </button>
      </div>
    </div>
  );
}

function ResumeCreationStepTwo({
  step1Summary,
  selectedTemplate,
  setSelectedTemplate,
  generating,
  onBack,
  t,
}: Readonly<{
  step1Summary: Step1Summary;
  selectedTemplate: ResumeTemplateId;
  setSelectedTemplate: (template: ResumeTemplateId) => void;
  generating: boolean;
  onBack: () => void;
  t: ReturnType<typeof useTranslations>;
}>) {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/30">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t("step2.reviewTitle")}
        </h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              {t("step2.titleLabel")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {step1Summary.title}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              {t("step2.languageLabel")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {step1Summary.language}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              {t("step2.jobSourceLabel")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {step1Summary.jobSourceSummary}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("step2.selectTemplateTitle")}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("step2.selectTemplateDescription")}
          </p>
        </div>

        <ResumeTemplatePicker
          value={selectedTemplate}
          onChange={setSelectedTemplate}
        />
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-700">
        <button
          type="button"
          onClick={onBack}
          className="mr-4 rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t("step2.back")}
        </button>

        <button
          type="submit"
          disabled={generating}
          className={`flex items-center justify-center rounded-xl px-8 py-3 font-medium text-white transition-all ${
            generating
              ? "cursor-not-allowed bg-blue-400 opacity-70"
              : "bg-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg"
          }`}
        >
          {generating ? (
            <>
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              {t("step2.generating")}
            </>
          ) : (
            <>
              <Sparkles className="mr-3 h-5 w-5" />
              {t("step2.generateButton")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function CreateResumePage() {
  const t = useTranslations("resumesEditor.create");
  const router = useRouter();
  const { createResume, generating, error } = useResumeStore();
  const [step, setStep] = useState<ResumeCreationStep>(1);
  const [sourceMode, setSourceMode] = useState<ResumeSourceMode>("job-offer");
  const [jobSearch, setJobSearch] = useState("");
  const [selectedJobOfferId, setSelectedJobOfferId] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ResumeTemplateId>("executive");

  const [formData, setFormData] = useState<ResumeFormData>({
    title: "",
    language: "EN",
    jobDescription: "",
  });

  const jobOfferFilters = useMemo(
    () => ({
      search: jobSearch.trim() || undefined,
      page: 1,
      limit: 20,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    }),
    [jobSearch],
  );

  const jobOffersQuery = usePublicJobOffers(jobOfferFilters);
  const publishedJobs = useMemo(
    () => jobOffersQuery.data?.items ?? [],
    [jobOffersQuery.data],
  );
  const selectedJobOffer = useMemo(
    () => publishedJobs.find((job) => job.id === selectedJobOfferId) ?? null,
    [publishedJobs, selectedJobOfferId],
  );
  const selectedJobOfferDescription = selectedJobOffer
    ? formatJobOfferDescription(selectedJobOffer)
    : "";

  const canProceedToTemplateStep =
    formData.title.trim().length > 0 &&
    (sourceMode === "job-offer"
      ? selectedJobOfferId.length > 0
      : formData.jobDescription.trim().length > 0);

  const step1Summary = useMemo<Step1Summary>(() => {
    return {
      title: formData.title.trim() || t("untitledResume"),
      language: formData.language,
      jobSourceSummary: getJobSourceSummary(
        sourceMode,
        selectedJobOffer,
        formData.jobDescription,
        t,
      ),
    };
  }, [
    formData.jobDescription,
    formData.language,
    formData.title,
    selectedJobOffer,
    sourceMode,
    t,
  ]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitResume = async (formValues: typeof formData) => {
    try {
      const payload: CreateResumeDto =
        sourceMode === "job-offer"
          ? {
              title: formValues.title.trim(),
              language: formValues.language,
              jobOfferId: selectedJobOfferId,
              template: selectedTemplate,
            }
          : {
              title: formValues.title.trim(),
              language: formValues.language,
              jobDescription: formValues.jobDescription.trim(),
              template: selectedTemplate,
            };

      const result = await createResume(payload);
      router.push(`/dashboard/resumes/${result.id}`);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (canProceedToTemplateStep) {
        setStep(2);
      }
      return;
    }

    void submitResume(formData);
  };

  const stepContent =
    step === 1 ? (
      <ResumeCreationStepOne
        formData={formData}
        handleChange={handleChange}
        generating={generating}
        sourceMode={sourceMode}
        setSourceMode={setSourceMode}
        jobSearch={jobSearch}
        setJobSearch={setJobSearch}
        selectedJobOfferId={selectedJobOfferId}
        setSelectedJobOfferId={setSelectedJobOfferId}
        jobOffersQuery={jobOffersQuery}
        publishedJobs={publishedJobs}
        selectedJobOfferDescription={selectedJobOfferDescription}
        canProceedToTemplateStep={canProceedToTemplateStep}
        t={t}
      />
    ) : (
      <ResumeCreationStepTwo
        step1Summary={step1Summary}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        generating={generating}
        onBack={() => setStep(1)}
        t={t}
      />
    );

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <Link
        href="/dashboard/resumes"
        className="mb-6 inline-flex items-center text-gray-500 transition hover:text-blue-600"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("backToResumes")}
      </Link>

      <div className="mb-8">
        <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-white">
          <Sparkles className="mr-3 h-7 w-7 text-blue-500" />
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("subtitle")}
        </p>
      </div>

      <ResumeCreationStepper currentStep={step} t={t} />

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800/30 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          {stepContent}
        </form>
      </div>
    </div>
  );
}
