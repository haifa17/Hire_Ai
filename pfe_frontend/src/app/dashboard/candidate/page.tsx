"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Wand2,
  Eye,
  ArrowRight,
  TrendingUp,
  CircleAlert,
  Sparkles,
  Loader2,
  MapPin,
  Building2,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { recommendationService } from "@/services/recommendationService";
import { profileService } from "@/services/profileService";
import { resumeService, type ResumeData } from "@/services/resumeService";
import type { RecommendationItem } from "@/domain/models/Recommendation";
import type { CandidateProfile } from "@/domain/models/Profile";

// ─── Static data ─────────────────────────────────────────────────────────────

const ACTION_CARD_ICONS = [Wand2, Sparkles, Eye] as const;
const ACTION_CARD_HREFS = [
  "/dashboard/resumes/create",
  "/dashboard/resumes/enhance",
  "/dashboard/candidate/applications",
] as const;
const ACTION_CARD_KEYS = ["generateCv", "enhanceResume", "viewApplications"] as const;

function RecommendationsLink({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Link
      href="/dashboard/candidate/recommendations"
      className="text-blue-600 hover:underline font-semibold"
    >
      {children}
    </Link>
  );
}

function computeProfileCompletion(profile: CandidateProfile | null): number {
  if (!profile) return 0;

  const checks = [
    Boolean(profile.personalInfo.summary.trim()),
    Boolean(profile.personalInfo.phone.trim()),
    Boolean(profile.personalInfo.location.trim()),
    Boolean(profile.personalInfo.desiredPosition.trim()),
    Boolean(profile.personalInfo.photoUrl),
    profile.experiences.length > 0,
    profile.educations.length > 0,
    profile.skills.length >= 3,
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

function getRecommendationScoreColor(hasScore: boolean, overallScore: number | null | undefined): string {
  if (!hasScore || overallScore === null || overallScore === undefined) return "text-gray-500 bg-gray-50";
  if (overallScore >= 80) return "text-emerald-700 bg-emerald-50";
  if (overallScore >= 60) return "text-blue-700 bg-blue-50";
  return "text-amber-700 bg-amber-50";
}

function computeBestAtsScore(resumes: ResumeData[]): number | null {
  const scores = resumes
    .map((resume) => resume.atsScore?.overall)
    .filter((score): score is number => typeof score === "number");

  if (scores.length === 0) return null;
  return Math.round(Math.max(...scores));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CandidateDashboard() {
  const t = useTranslations("candidateDashboard.overview");
  const { user } = useAuthStore();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsLoading, setAtsLoading] = useState(true);

  const candidateId = user?.id ?? "";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profile = await profileService.getCandidateProfileForBuilder();
        if (!cancelled) setProfileCompletion(computeProfileCompletion(profile));
      } catch {
        // Silently fail — dashboard still works without profile completion
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    (async () => {
      try {
        const resumes: ResumeData[] = await resumeService.getResumes();
        if (!cancelled) setAtsScore(computeBestAtsScore(resumes ?? []));
      } catch {
        // Silently fail — dashboard still works without an AI resume score
      } finally {
        if (!cancelled) setAtsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchRecommendations = useCallback(async () => {
    if (!candidateId) {
      setRecLoading(false);
      return;
    }
    try {
      const res = await recommendationService.getJobRecommendations(candidateId, 4);
      const list = res.recommendations || [];
      setRecommendations(list);

      // If no stored recommendations, backend triggered async generation
      if (list.length === 0 && res.generating) {
        setIsGenerating(true);
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts += 1;
          try {
            const pollRes = await recommendationService.getJobRecommendations(candidateId, 4);
            const polledList = pollRes.recommendations || [];
            if (polledList.length > 0) {
              setRecommendations(polledList);
              setIsGenerating(false);
              clearInterval(interval);
            } else if (attempts >= 6) {
              setIsGenerating(false);
              clearInterval(interval);
            }
          } catch {
            clearInterval(interval);
            setIsGenerating(false);
          }
        }, 3000);
      }
    } catch {
      // Silently fail — dashboard still works without recommendations
    } finally {
      setRecLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    const runFetch = () => {
      void fetchRecommendations();
    };
    runFetch();
  }, [fetchRecommendations]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* ── Welcome row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        {/* Left: greeting + profile completion */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("welcome", { name: user?.firstName ?? t("defaultName") })} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("subtitle")}
          </p>

          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-600">
                {t("profileCompletion")}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {profileLoading ? "…" : `${profileCompletion}%`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{ width: `${profileLoading ? 0 : profileCompletion}%` }}
              />
            </div>
            {!profileLoading && profileCompletion < 100 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <CircleAlert className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                {t("completionTip")}
              </p>
            )}
          </div>
        </div>

        {/* Right: AI Resume Score */}
        <div className="lg:w-52 shrink-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
          <p className="text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            {t("aiResumeScore")}
          </p>
          <p className="mt-2 text-5xl font-bold text-blue-600">
            {atsLoading ? "…" : (atsScore ?? "—")}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t("outOf100")}</p>
          {!atsLoading && atsScore !== null ? (
            <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <TrendingUp className="h-3 w-3" />
              {t("topPercentTech")}
            </div>
          ) : (
            !atsLoading && (
              <Link
                href="/dashboard/resumes/create"
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {t("actionCards.generateCv.title")}
              </Link>
            )
          )}
        </div>
      </div>

      {/* ── Action cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ACTION_CARD_KEYS.map((key, i) => {
          const Icon = ACTION_CARD_ICONS[i];
          return (
            <Link key={key} href={ACTION_CARD_HREFS[i]}>
              <div className="flex flex-col items-center text-center gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <Icon className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {t(`actionCards.${key}.title`)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{t(`actionCards.${key}.description`)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Recommended for You ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {t("recommendedForYou")}
            </h2>
            {recommendations.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                {t("aiMatchesCount", { count: recommendations.length })}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/candidate/recommendations"
            className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {t("viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Loading */}
        {recLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}

        {/* Background Generating */}
        {!recLoading && isGenerating && recommendations.length === 0 && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-blue-900">
              {t("generatingRecommendations")}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {t("generatingRecommendationsHint")}
            </p>
          </div>
        )}

        {/* Empty */}
        {!recLoading && !isGenerating && recommendations.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
            <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">
              {t("noRecommendations")}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t.rich("noRecommendationsHint", {
                link: (chunks) => <RecommendationsLink>{chunks}</RecommendationsLink>,
              })}
            </p>
          </div>
        )}

        {/* Cards */}
        {!recLoading && recommendations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendations.slice(0, 4).map((rec) => {
              const meta = rec.metadata || {};
              const title = (meta.title as string) || t("untitledPosition");
              const company = (meta.company as string) || "";
              const location = (meta.location as string) || "";
              const skills = (meta.required_skills as string[]) || [];
              const salaryMin = meta.salary_min as number | undefined;
              const salaryMax = meta.salary_max as number | undefined;
              const currency = (meta.currency as string) || "USD";

              const hasScore = rec.overall_score !== null && rec.overall_score !== undefined;
              const scoreColor = getRecommendationScoreColor(hasScore, rec.overall_score);

              const initial = company ? company[0].toUpperCase() : "?";
              const bgColors = ["bg-blue-600", "bg-indigo-600", "bg-violet-600", "bg-emerald-600"];
              const logoBg = bgColors[rec.rank % bgColors.length];

              const fmtSalary = () => {
                if (!salaryMin && !salaryMax) return "";
                const fmt = (n: number) =>
                  n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
                if (salaryMin && salaryMax) return `${fmt(salaryMin)} – ${fmt(salaryMax)} ${currency}`;
                if (salaryMax) return t("salaryUpTo", { amount: fmt(salaryMax), currency });
                return t("salaryFrom", { amount: fmt(salaryMin!), currency });
              };

              return (
                <div
                  key={rec.entity_id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold text-white ${logoBg}`}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {title}
                        </p>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          {company && (
                            <>
                              <Building2 className="h-3 w-3 shrink-0" />
                              {company}
                            </>
                          )}
                          {location && (
                            <>
                              <span className="text-gray-300 mx-0.5">•</span>
                              <MapPin className="h-3 w-3 shrink-0" />
                              {location}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor}`}
                    >
                      {hasScore ? t("matchPercent", { percent: Math.round(rec.overall_score!) }) : "—"}
                    </span>
                  </div>

                  {/* Tags */}
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {skills.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-600 uppercase"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer row */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-600">
                      {fmtSalary()}
                    </span>
                    <Link
                      href="/dashboard/candidate/recommendations"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {t("viewDetails")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
