"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  Mail,
  MapPin,
  User,
  Sparkles,
  Phone,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  Clock,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { resolveUploadUrl, cn } from "@/lib/utils";
import Panel from "@/components/applications/Panel";
import ApplicationTimeline from "@/components/applications/ApplicationTimeline";
import ScoreRing from "@/components/applications/ScoreRing";
import { Button } from "@/components/ui/Button";

type ApplicationStatus =
  | "PENDING"
  | "REVIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "ACCEPTED"
  | "REJECTED";

type RecruiterResponse = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  photoUrl?: string;
  position?: string;
  recruiterProfile?: {
    position?: string;
  };
};

type CandidateProfileResponse = {
  professionalSummary?: string | null;
  skills?: string[] | string | null;
};

type CandidateResponse = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  candidateProfile?: CandidateProfileResponse | null;
};

type CompanyResponse = {
  id?: string;
  name?: string;
  logoUrl?: string | null;
};

type JobOfferResponse = {
  id?: string;
  title?: string;
  employmentType?: string;
  workplaceType?: string;
  city?: string;
  country?: string;
  location?: string;
  company?: CompanyResponse;
  recruiter?: RecruiterResponse;
};

type AiCriterionScore = {
  score?: number;
  matched?: string[];
  missing?: string[];
};

type AiAnalysisResponse = {
  matchPercentage?: number;
  matchScore?: number;
  overallMatch?: number;
  score?: number;
  atsScore?: number;
  globalScore?: number;
  strengths?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
  gaps?: string[];
  summary?: string;
  candidateSummary?: string;
  explanation?:
    | string
    | {
        recommendation?: string;
        summary?: string;
        strengths?: string[];
        missingSkills?: string[];
        weaknesses?: string[];
        [key: string]: unknown;
      };
  // Unified 7-criterion breakdown (0-1 fractions, `null`/absent when a
  // criterion couldn't be evaluated) — see
  // backend/ai-service/app/schemas/scoring.py::UnifiedBreakdownSchema.
  breakdown?: {
    skills?: number | null;
    experience?: number | null;
    semantic?: number | null;
    education?: number | null;
    projects?: number | null;
    languages?: number | null;
    certifications?: number | null;
  } | null;
  unavailableCriteria?: string[];
  // rule-based (ESCO+rapidfuzz) + semantic (bge-m3) + ranking engine outputs
  scoringMethod?: "fixed_weights" | "lgbm";
  ruleBasedScore?: {
    total?: number;
    skills?: AiCriterionScore;
    experience?: AiCriterionScore;
    projects?: AiCriterionScore;
    education?: AiCriterionScore;
    languages?: AiCriterionScore;
    certifications?: AiCriterionScore;
  } | null;
  semanticScore?: {
    aggregate?: number;
    summary?: number;
    skills?: number;
    experience?: number;
  } | null;
  shapExplanation?: Array<{ feature: string; value: number; contribution: number }>;
};

type ApplicationResponse = {
  id: string;
  status?: ApplicationStatus;
  createdAt?: string;
  coverLetter?: string | null;
  coverLetterUrl?: string | null;
  coverLetterMetadata?: { originalName?: string; size?: number } | null;
  aiAnalysis?: AiAnalysisResponse | null;
  jobOffer?: JobOfferResponse;
  cvUrl?: string;
  cvMetadata?: { originalName?: string; size?: number } | null;
  candidate?: CandidateResponse;
  supportingDocuments?: Array<{
    originalName?: string;
    url?: string;
    size?: number;
  }>;
};

const APPLICATION_STATUS_OPTIONS: ApplicationStatus[] = [
  "PENDING",
  "REVIEWED",
  "SHORTLISTED",
  "INTERVIEW",
  "ACCEPTED",
  "REJECTED",
];

function formatApplicantName(candidate: CandidateResponse | null | undefined, fallback: string) {
  if (!candidate) return fallback;
  const parts = [candidate.firstName, candidate.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : fallback;
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: "statusLabels.pending",
  REVIEWED: "statusLabels.reviewed",
  SHORTLISTED: "statusLabels.shortlisted",
  INTERVIEW: "statusLabels.interview",
  ACCEPTED: "statusLabels.accepted",
  REJECTED: "statusLabels.rejected",
};

function formatStatusLabel(status: string | undefined, t: (key: string) => string, unknownLabel: string) {
  if (!status) return unknownLabel;
  const key = STATUS_LABEL_KEYS[status];
  return key ? t(key) : status.replaceAll("_", " ");
}

function getStatusStyles(status?: string) {
  switch (status) {
    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-[0_2px_10px_rgba(16,185,129,0.08)]";
    case "INTERVIEW":
      return "bg-blue-50 text-blue-700 border-blue-200/80 shadow-[0_2px_10px_rgba(59,130,246,0.08)]";
    case "SHORTLISTED":
      return "bg-violet-50 text-violet-700 border-violet-200/80 shadow-[0_2px_10px_rgba(139,92,246,0.08)]";
    case "REVIEWED":
      return "bg-amber-50 text-amber-700 border-amber-200/80 shadow-[0_2px_10px_rgba(245,158,11,0.08)]";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border-rose-200/80 shadow-[0_2px_10px_rgba(244,63,94,0.08)]";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200/80 shadow-[0_2px_10px_rgba(100,116,139,0.08)]";
  }
}

function getAiMatchScore(application: ApplicationResponse): number | null {
  const analysis = application.aiAnalysis;
  if (analysis && typeof analysis === "object") {
    const rawScore =
      analysis.matchPercentage ??
      analysis.matchScore ??
      analysis.overallMatch ??
      analysis.score ??
      analysis.atsScore ??
      analysis.globalScore;

    if (typeof rawScore === "number") {
      return Math.max(0, Math.min(100, Math.round(rawScore)));
    }

    if (typeof rawScore === "string") {
      const parsedScore = Number.parseFloat(rawScore);
      if (Number.isFinite(parsedScore)) {
        return Math.max(0, Math.min(100, Math.round(parsedScore)));
      }
    }
  }

  return null;
}

function parseCandidateSkills(skills: unknown): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return skills
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

type ScoreBreakdownItem = { label: string; value: number | null; color: string };
type DocumentItem = { id: string; name: string; url?: string; size?: string };

function AnalysisTab({
  aiScore,
  isRematching,
  onRematch,
  scoreBreakdown,
  aiSummaryText,
  aiStrengths,
  aiGaps,
  matchedSkills,
  missingSkills,
  t,
}: Readonly<{
  aiScore: number | null;
  isRematching: boolean;
  onRematch: () => void;
  scoreBreakdown: ScoreBreakdownItem[];
  aiSummaryText: string;
  aiStrengths: string[];
  aiGaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
  t: ReturnType<typeof useTranslations>;
}>) {
  if (aiScore === null) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200/80 text-center space-y-4 shadow-3xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-500 shadow-sm animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800 text-sm">{t("aiInsights.pendingTitle")}</h4>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{t("aiInsights.pendingDescription")}</p>
        </div>
        <Button
          onClick={onRematch}
          disabled={isRematching}
          isLoading={isRematching}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer transition-all duration-200"
        >
          <Sparkles className="h-4 w-4" />
          {t("aiInsights.runMatchScore")}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Score section */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center border-b border-slate-100 pb-6">
        <div className="flex flex-col items-center text-center p-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-150 shadow-2xs min-w-[150px]">
          <ScoreRing score={aiScore} size={92} />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-2 block">
            {t("aiInsights.atsMatchRating")}
          </span>
        </div>
        <div className="space-y-3.5 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("aiInsights.matchRatingBreakdown")}
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {scoreBreakdown.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">{item.label}</span>
                  <span className="font-extrabold text-slate-900">
                    {item.value === null ? t("aiInsights.notEvaluated") : `${item.value}%`}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", item.color)}
                    style={{ width: `${item.value ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights & Recommendation Summarizer */}
      <div className="rounded-2xl border border-l-4 border-indigo-100 border-l-indigo-600 bg-gradient-to-br from-indigo-50/10 to-blue-50/5 p-5 shadow-3xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <h4 className="font-bold text-slate-950 text-sm">
            {t("aiInsights.recommendationTitle")}
          </h4>
        </div>
        <p className="text-sm leading-relaxed text-slate-700 font-medium italic">
          &quot;{aiSummaryText}&quot;
        </p>
      </div>

      {/* Strengths & Missing checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strong Signals */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/5 p-5 shadow-3xs">
          <div className="flex items-center gap-2 text-emerald-800 mb-3.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <h4 className="font-bold text-sm text-emerald-950">{t("aiInsights.keyFitStrengths")}</h4>
          </div>
          <ul className="space-y-2.5 text-xs leading-relaxed text-slate-700">
            {aiStrengths.map((str, idx) => (
              <li key={`${str}-${idx}`} className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0 bg-emerald-50 rounded p-0.5" />
                <span className="font-medium">{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Gaps / Areas to check */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50/5 p-5 shadow-3xs">
          <div className="flex items-center gap-2 text-amber-800 mb-3.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <h4 className="font-bold text-sm text-amber-950">{t("aiInsights.areasForReview")}</h4>
          </div>
          <ul className="space-y-2.5 text-xs leading-relaxed text-slate-700">
            {aiGaps.map((gap, idx) => (
              <li key={`${gap}-${idx}`} className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0 bg-amber-50 rounded p-0.5" />
                <span className="font-medium">{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Skills Match Analysis section */}
      <div className="space-y-4 pt-5 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
            <Briefcase className="h-4.5 w-4.5" />
          </div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            {t("aiInsights.skillsMatchAnalysis")}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Matched Skills */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/20 p-5">
            <h5 className="font-bold text-xs text-slate-800 mb-3.5 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">✓</span>
              {t("aiInsights.matchedCoreSkills", { count: matchedSkills.length })}
            </h5>
            {matchedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((skill: string, idx: number) => (
                  <span key={`${skill}-${idx}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-3xs">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">{t("aiInsights.noMatchedSkills")}</p>
            )}
          </div>

          {/* Missing Skills */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/20 p-5">
            <h5 className="font-bold text-xs text-slate-800 mb-3.5 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">!</span>
              {t("aiInsights.missingRequiredSkills", { count: missingSkills.length })}
            </h5>
            {missingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((skill: string, idx: number) => (
                  <span key={`${skill}-${idx}`} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-3xs">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-600 font-bold italic flex items-center gap-1.5">
                <Check className="h-4 w-4 bg-emerald-100 rounded-full p-0.5" /> {t("aiInsights.allSkillsMatching")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileTab({
  application,
  candidateFullName,
  skills,
  t,
}: Readonly<{
  application: ApplicationResponse;
  candidateFullName: string;
  skills: string[];
  t: ReturnType<typeof useTranslations>;
}>) {
  return (
    <div className="space-y-6">
      {application?.candidate?.id && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-3xs">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{t("profile.viewCompleteProfile")}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{t("profile.viewCompleteProfileDescription")}</p>
          </div>
          <Link
            href={`/dashboard/recruiter/candidates/${application.candidate.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors shrink-0"
          >
            {t("profile.openProfile")} <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Contact detail information */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {t("profile.contactDetails")}
          </h4>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <a href={`mailto:${application.candidate?.email}`} className="text-blue-600 hover:underline">
                {application.candidate?.email ?? t("profile.notProvided")}
              </a>
            </div>
            {application.candidate?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <a href={`tel:${application.candidate.phone}`} className="hover:text-slate-900">
                  {application.candidate.phone}
                </a>
              </div>
            )}
            {application.candidate?.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{application.candidate.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile details summary */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {t("profile.candidateOverview")}
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t("profile.candidateOverviewDescription")}
          </p>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {t("profile.professionalSummary")}
        </h4>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-2xs whitespace-pre-line">
          {application.candidate?.candidateProfile?.professionalSummary ?? (
            <span className="text-slate-400 italic">{t("profile.noSummary")}</span>
          )}
        </div>
      </div>

      {/* Skills Checklist */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {t("profile.expertiseSkillsTags")}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {skills.length > 0 ? (
            skills.map((skill, index) => (
              <span
                key={`${skill}-${index}`}
                className="inline-flex items-center rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors cursor-default"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">{t("profile.noSkillsListed")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentCard({ doc, t }: Readonly<{ doc: DocumentItem; t: ReturnType<typeof useTranslations> }>) {
  return (
    <div className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-blue-200 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 group-hover:bg-blue-100 transition-colors shrink-0">
          <FileText className="h-5.5 w-5.5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {doc.name}
          </h4>
          {doc.size && <p className="text-xs text-slate-400 mt-0.5">{doc.size}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {doc.url ? (
          <>
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("documents.viewFile")}
            </a>
            <a
              href={doc.url}
              download
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title={t("documents.downloadFile")}
            >
              <Download className="h-4 w-4" />
            </a>
          </>
        ) : (
          <span className="text-xs text-slate-400 italic">{t("documents.fileUnavailable")}</span>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({
  documents,
  t,
}: Readonly<{ documents: DocumentItem[]; t: ReturnType<typeof useTranslations> }>) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-10 w-10 text-slate-300 mx-auto" />
        <p className="mt-2 text-sm text-slate-400 italic">{t("documents.noFiles")}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {documents.map((d) => (
        <DocumentCard key={d.id} doc={d} t={t} />
      ))}
    </div>
  );
}

export default function RecruiterApplicationDetailsPage() {
  const t = useTranslations("recruiterDashboard.applicantDetail");
  const params = useParams() as { id?: string };
  const id = params?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState<ApplicationStatus | "">("");
  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "profile" | "documents">("analysis");
  const [isRematching, setIsRematching] = useState(false);

  const handleRematch = async () => {
    if (!id) return;
    setIsRematching(true);
    try {
      const response = await api.get(`/applications/${id}/match-score?force=true`, {
        timeout: 120000, // 2 minutes timeout for the heavy AI matching task
      });
      const updatedAnalysis = response.data?.data ?? response.data;
      setApplication((prev) => prev ? { ...prev, aiAnalysis: updatedAnalysis } : null);
      toast.success(t("toast.matchRecalculated"));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(axiosError?.response?.data?.message || axiosError.message || t("toast.matchRecalculateFailed"));
    } finally {
      setIsRematching(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    const startLoading = () => setLoading(true);
    startLoading();
    api
      .get(`/applications/${id}`)
      .then((response) => {
        const nextApplication = response.data?.data ?? response.data;
        setApplication(nextApplication);
        setStatusDraft(nextApplication.status ?? "");
      })
      .catch((error) =>
        toast.error(error?.response?.data?.message || error.message),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!application || !statusDraft || statusDraft === application.status) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await api.patch(
        `/applications/${application.id}/status`,
        {
          status: statusDraft,
        },
      );
      const updatedApplication = response.data?.data ?? response.data;
      setApplication(updatedApplication);
      setStatusDraft(updatedApplication.status ?? statusDraft);
      toast.success(t("toast.statusUpdated"));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(axiosError?.response?.data?.message || axiosError.message || t("toast.somethingWentWrong"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const job = application?.jobOffer ?? null;
  const companyName = job?.company?.name ?? t("unknownCompany");
  const recruiter = job?.recruiter;
  const recruiterFullName = useMemo(() => {
    const parts = [recruiter?.firstName, recruiter?.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : t("recruiterFallback");
  }, [recruiter?.firstName, recruiter?.lastName, t]);
  const recruiterPosition =
    recruiter?.position ?? recruiter?.recruiterProfile?.position ?? t("recruiterFallback");
  const recruiterAvatar = recruiter?.avatarUrl ?? recruiter?.photoUrl;
  const candidateFullName = formatApplicantName(application?.candidate, t("candidateFallback"));
  const aiScore = application ? getAiMatchScore(application) : null;

  const timelineSteps = [
    { key: "applied", label: t("timeline.applied"), active: true },
    {
      key: "reviewed",
      label: t("timeline.reviewed"),
      active: (application?.status ?? "PENDING") !== "PENDING",
    },
    {
      key: "interview",
      label: t("timeline.interview"),
      active:
        application?.status === "INTERVIEW" ||
        application?.status === "ACCEPTED",
    },
    {
      key: "offer",
      label: t("timeline.offer"),
      active: application?.status === "ACCEPTED",
    },
  ];

  const documents = useMemo(() => {
    const items: Array<{ id: string; name: string; url?: string; size?: string }> = [];

    if (application?.cvUrl) {
      const sizeStr = application.cvMetadata?.size
        ? `${(application.cvMetadata.size / (1024 * 1024)).toFixed(2)} MB`
        : undefined;

      items.push({
        id: "cv",
        name: application.cvMetadata?.originalName ?? t("documents.cvFallbackName"),
        url: resolveUploadUrl(application.cvUrl),
        size: sizeStr,
      });
    }

    const coverUrl =
      application?.coverLetterUrl ||
      (application?.coverLetter?.startsWith("/uploads")
        ? application.coverLetter
        : null);

    if (coverUrl) {
      const sizeStr = application?.coverLetterMetadata?.size
        ? `${(application.coverLetterMetadata.size / (1024 * 1024)).toFixed(2)} MB`
        : undefined;

      items.push({
        id: "cover-letter",
        name:
          application?.coverLetterMetadata?.originalName ?? t("documents.coverLetterFallbackName"),
        url: resolveUploadUrl(coverUrl),
        size: sizeStr,
      });
    }

    (application?.supportingDocuments ?? []).forEach((document, index) => {
      const sizeStr = document.size
        ? `${(document.size / (1024 * 1024)).toFixed(2)} MB`
        : undefined;

      items.push({
        id: `supporting-${index}`,
        name: document.originalName ?? t("documents.supportingFallbackName", { index: index + 1 }),
        url: resolveUploadUrl(document.url),
        size: sizeStr,
      });
    });

    return items;
  }, [application, t]);

  // Derived AI content
  const aiStrengths = useMemo(() => {
    if (!application?.aiAnalysis) {
      return [
        t("aiInsights.defaultStrengths.0"),
        t("aiInsights.defaultStrengths.1"),
        t("aiInsights.defaultStrengths.2"),
      ];
    }
    const analysis = application.aiAnalysis;
    const explanationObj = typeof analysis.explanation === "object" ? analysis.explanation : undefined;
    const strengths = analysis.strengths ?? explanationObj?.strengths;
    return strengths && Array.isArray(strengths) && strengths.length > 0
      ? strengths
      : [t("aiInsights.fallbackStrengths.0"), t("aiInsights.fallbackStrengths.1")];
  }, [application, t]);

  const aiGaps = useMemo(() => {
    if (!application?.aiAnalysis) {
      return [
        t("aiInsights.defaultGaps.0"),
        t("aiInsights.defaultGaps.1"),
      ];
    }
    const analysis = application.aiAnalysis;
    const explanationObj = typeof analysis.explanation === "object" ? analysis.explanation : undefined;
    const gaps = analysis.gaps ?? analysis.missingSkills ?? explanationObj?.missingSkills ?? explanationObj?.weaknesses;
    return gaps && Array.isArray(gaps) && gaps.length > 0
      ? gaps
      : [t("aiInsights.noGaps")];
  }, [application, t]);

  const aiSummaryText = useMemo(() => {
    if (!application?.aiAnalysis) {
      return t("aiInsights.defaultSummary");
    }
    const analysis = application.aiAnalysis;
    const summary = analysis.summary ?? analysis.candidateSummary;
    if (summary) return summary;

    const explanation = analysis.explanation;
    if (explanation) {
      if (typeof explanation === "string") return explanation;
      if (typeof explanation === "object") {
        return explanation.recommendation ?? explanation.summary ?? JSON.stringify(explanation);
      }
    }
    return t("aiInsights.fallbackSummary");
  }, [application, t]);

  const skills = useMemo(() => {
    return parseCandidateSkills(application?.candidate?.candidateProfile?.skills);
  }, [application]);

  const matchedSkills = useMemo<string[]>(() => {
    return application?.aiAnalysis?.matchedSkills ?? [];
  }, [application]);

  const missingSkills = useMemo<string[]>(() => {
    const explanationObj =
      typeof application?.aiAnalysis?.explanation === "object"
        ? application.aiAnalysis.explanation
        : undefined;
    return application?.aiAnalysis?.missingSkills ?? explanationObj?.missingSkills ?? [];
  }, [application]);

  const scoreBreakdown = useMemo(() => {
    const breakdown = application?.aiAnalysis?.breakdown;
    // Unified breakdown fields are 0-1 fractions, or `null`/`undefined` when
    // a criterion couldn't be evaluated (missing requirement/data) — surface
    // that as `null` here rather than a fake 0%, and only include criteria
    // the current breakdown shape actually carries.
    const toPct = (v: unknown): number | null => (typeof v === "number" ? Math.round(v * 100) : null);
    return [
      { label: t("scoreBreakdown.requiredSkills"), value: toPct(breakdown?.skills), color: "bg-blue-600" },
      { label: t("scoreBreakdown.experienceRelevance"), value: toPct(breakdown?.experience), color: "bg-emerald-600" },
      { label: t("scoreBreakdown.embeddingSimilarity"), value: toPct(breakdown?.semantic), color: "bg-pink-600" },
      { label: t("scoreBreakdown.educationMatch"), value: toPct(breakdown?.education), color: "bg-purple-600" },
      { label: t("scoreBreakdown.projectsFit"), value: toPct(breakdown?.projects), color: "bg-amber-600" },
      { label: t("scoreBreakdown.languageFit"), value: toPct(breakdown?.languages), color: "bg-cyan-600" },
      { label: t("scoreBreakdown.certificationsFit"), value: toPct(breakdown?.certifications), color: "bg-slate-600" },
    ];
  }, [application, t]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-8 py-4 animate-pulse">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-3">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="h-8 w-60 rounded bg-slate-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 rounded bg-slate-200" />
            <div className="h-10 w-32 rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="h-44 rounded-2xl bg-slate-100" />
            <div className="h-96 rounded-2xl bg-slate-100" />
          </div>
          <div className="space-y-6">
            <div className="h-48 rounded-2xl bg-slate-100" />
            <div className="h-64 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!application || !job) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {t("notFound.description")}
        </p>
        <Link href="/dashboard/recruiter/applicants" className="mt-6 inline-block">
          <Button variant="outline">{t("notFound.returnToApplications")}</Button>
        </Link>
      </div>
    );
  }

  const backHref = job.id
    ? `/dashboard/recruiter/applicants?jobId=${job.id}`
    : "/dashboard/recruiter/applicants";

  return (
    <div className="px-4 md:px-8 pb-12">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header Breadcrumb & Actions */}
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("backToApplications")}
            </Link>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                {t("heading")}
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all ${getStatusStyles(application.status)}`}
              >
                {formatStatusLabel(application.status, t, t("statusLabels.unknown"))}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleRematch}
              disabled={isRematching}
              isLoading={isRematching}
              variant="outline"
              className="border-slate-200 text-indigo-705 hover:bg-indigo-50/50 hover:text-indigo-700 gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-indigo-500" />
              {t("rematchCandidate")}
            </Button>
            <Link
              href={`/dashboard/recruiter/interviews/schedule?applicationId=${application.id}`}
            >
              <Button className="shadow-xs bg-blue-600 hover:bg-blue-700 gap-2 cursor-pointer">
                <CalendarDays className="h-4 w-4" />
                {t("scheduleInterview")}
              </Button>
            </Link>
            <Link href={`/dashboard/recruiter/applicants?jobId=${job.id}`}>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
                {t("viewAll")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] items-start">
          
          {/* Main Content Area */}
          <div className="space-y-6">
            
            {/* Primary Details Panel (Candidate name & Status tracker) */}
            <Panel className="relative overflow-hidden bg-linear-to-br from-white to-slate-50/30">
              <div className="absolute top-0 right-0 h-32 w-32 bg-blue-600/5 rounded-bl-full pointer-events-none" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    {t("applicantProfile")}
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {candidateFullName}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    {t("appliedForAt", { job: job.title ?? "", company: companyName })}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-slate-900 shadow-xs sm:text-right min-w-[140px]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("applicationId")}
                  </p>
                  <p className="text-xs font-mono font-bold mt-0.5 text-slate-700">
                    {application.id.slice(0, 8)}...{application.id.slice(-4)}
                  </p>
                </div>
              </div>
              
              {/* Timeline Track */}
              <div className="mt-5 overflow-x-auto pb-1">
                <ApplicationTimeline steps={timelineSteps} />
              </div>
            </Panel>

            {/* TAB SYSTEM SECTION */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(2,6,23,0.03)]">
              {/* Tab Header Selector */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 px-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-5 py-4 text-xs font-bold uppercase tracking-wider transition-all shrink-0",
                    activeTab === "analysis"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  {t("tabs.aiInsights")}
                </button>
                {application?.candidate?.id ? (
                  <Link
                    href={`/dashboard/recruiter/candidates/${application.candidate.id}`}
                    className="flex items-center gap-2 border-b-2 border-transparent px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-blue-600 transition-all shrink-0"
                  >
                    <User className="h-4 w-4" />
                    {t("tabs.fullProfile")}
                    <ExternalLink className="h-3 w-3 ml-0.5 text-slate-400" />
                  </Link>
                ) : (
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={cn(
                      "flex items-center gap-2 border-b-2 px-5 py-4 text-xs font-bold uppercase tracking-wider transition-all shrink-0",
                      activeTab === "profile"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <User className="h-4 w-4" />
                    {t("tabs.fullProfile")}
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("documents")}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-5 py-4 text-xs font-bold uppercase tracking-wider transition-all shrink-0",
                    activeTab === "documents"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  {t("tabs.documents", { count: documents.length })}
                </button>
              </div>

              {/* Tab Contents Panel */}
              <div className="p-6">
                
                {/* 1. AI INSIGHTS TAB */}
                {activeTab === "analysis" && (
                  <div className="space-y-6">
                    <AnalysisTab
                      aiScore={aiScore}
                      isRematching={isRematching}
                      onRematch={handleRematch}
                      scoreBreakdown={scoreBreakdown}
                      aiSummaryText={aiSummaryText}
                      aiStrengths={aiStrengths}
                      aiGaps={aiGaps}
                      matchedSkills={matchedSkills}
                      missingSkills={missingSkills}
                      t={t}
                    />
                  </div>
                )}

                {/* 2. FULL PROFILE TAB */}
                {activeTab === "profile" && (
                  <ProfileTab
                    application={application}
                    candidateFullName={candidateFullName}
                    skills={skills}
                    t={t}
                  />
                )}

                {/* 3. SUBMITTED DOCUMENTS TAB */}
                {activeTab === "documents" && (
                  <DocumentsTab documents={documents} t={t} />
                )}
              </div>
            </div>

            {/* COVER LETTER SECTION */}
            {application.coverLetter ? (
              <Panel>
                <div className="flex items-center gap-2 mb-3.5">
                  <FileText className="h-4.5 w-4.5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {t("coverLetterTitle")}
                  </h3>
                </div>
                <div className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-sm leading-relaxed text-slate-700">
                  {application.coverLetter}
                </div>
              </Panel>
            ) : null}
          </div>

          {/* Sidebar Right Column */}
          <aside className="space-y-6">
            
            {/* Status updates controller */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.03)] space-y-4">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  {t("sidebar.statusTransition")}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {t("sidebar.statusTransitionDescription")}
                </p>
              </div>

              <div className="space-y-3">
                <select
                  value={statusDraft}
                  onChange={(event) =>
                    setStatusDraft(event.target.value as ApplicationStatus)
                  }
                  className="form-select"
                >
                  <option value="" disabled>
                    {t("sidebar.selectNewStatus")}
                  </option>
                  {APPLICATION_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatStatusLabel(option, t, t("statusLabels.unknown"))}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={
                    isUpdatingStatus ||
                    !statusDraft ||
                    statusDraft === application.status
                  }
                  isLoading={isUpdatingStatus}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                >
                  {t("sidebar.saveStatusUpdate")}
                </Button>
              </div>
            </div>

            {/* Sidebar Section 2: Candidate Bio card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.03)] space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {t("sidebar.candidateContact")}
              </h4>
              <div className="flex items-center gap-3">
                {application.candidate?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveUploadUrl(application.candidate.photoUrl)}
                    alt={candidateFullName}
                    className="h-12 w-12 rounded-full object-cover border-2 border-slate-100 shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                    <User className="h-5.5 w-5.5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {candidateFullName}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {application.candidate?.email ?? t("sidebar.noEmail")}
                  </div>
                  {application.candidate?.email ? (
                    <a
                      href={`mailto:${application.candidate.email}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {t("sidebar.contactCandidate")}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Sidebar Section 3: Job Brief card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.03)] space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {t("sidebar.jobOfferDetails")}
              </h4>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 font-bold text-slate-800">
                  <Briefcase className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{job.title}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    {job.city}, {job.country}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    {t("sidebar.appliedOn", { date: new Date(application.createdAt ?? "").toLocaleDateString() })}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{job.employmentType ?? t("sidebar.fullTime")}</span>
                </div>
              </div>
            </div>

            {/* Sidebar Section 4: Recruiter Brief card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.03)] space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {t("sidebar.assignedRecruiter")}
              </h4>
              {recruiter ? (
                <div className="flex items-center gap-3">
                  {recruiterAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveUploadUrl(recruiterAvatar)}
                      alt={recruiterFullName}
                      className="h-12 w-12 rounded-full object-cover border-2 border-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                      <User className="h-5.5 w-5.5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {recruiterFullName}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {recruiterPosition}
                    </div>
                    {recruiter?.email ? (
                      <a
                        href={`mailto:${recruiter.email}`}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {t("sidebar.emailRecruiter")}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">{t("sidebar.noRecruiterAssigned")}</p>
              )}
            </div>
            
          </aside>
        </div>
      </div>
    </div>
  );
}
