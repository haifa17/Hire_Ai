"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { recommendationService } from "@/services/recommendationService";
import { jobOfferService } from "@/services/jobOfferService";
import { CandidateRecommendationCard } from "@/components/recommendations/CandidateRecommendationCard";
import type {
  RecommendationItem,
} from "@/domain/models/Recommendation";
import type { JobOffer } from "@/domain/models/JobOffer";
import {
  Users,
  RefreshCcw,
  Loader2,
  Inbox,
  ArrowUpDown,
  ArrowLeft,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type SortBy = "score" | "skills" | "experience" | "semantic";

export default function JobCandidateRecommendationsPage() {
  const t = useTranslations("recruiterDashboard.jobRecommendations");
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobOffer | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState<string>("");
  const [cached, setCached] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("score");

  // Fetch job details
  useEffect(() => {
    if (!jobId) return;
    jobOfferService.getById(jobId).then(setJob).catch(() => {});
  }, [jobId]);

  const fetchRecommendations = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await recommendationService.getCandidateRecommendations(jobId);
      setRecommendations(res.recommendations || []);
      setComputedAt(res.computed_at || "");
      setCached(res.cached ?? false);
    } catch {
      setError(t("errors.load"));
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  const handleRefresh = async () => {
    if (!jobId) return;
    setRefreshing(true);
    setError(null);
    try {
      const res = await recommendationService.refreshCandidateRecommendations(jobId);
      setRecommendations(res.recommendations || []);
      setComputedAt(res.computed_at || "");
      setCached(false);
    } catch {
      setError(t("errors.refresh"));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const runFetch = () => {
      void fetchRecommendations();
    };
    runFetch();
  }, [fetchRecommendations]);

  // Sort recommendations. `overall_score`/breakdown values can be `null`
  // (criterion unavailable) — treated as lowest priority rather than
  // crashing the comparator.
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    switch (sortBy) {
      case "skills":
        return (b.breakdown.skills ?? -1) - (a.breakdown.skills ?? -1);
      case "experience":
        return (b.breakdown.experience ?? -1) - (a.breakdown.experience ?? -1);
      case "semantic":
        return (b.breakdown.semantic ?? -1) - (a.breakdown.semantic ?? -1);
      default:
        return (b.overall_score ?? -1) - (a.overall_score ?? -1);
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in-up">
      {/* Back link */}
      <Link
        href={`/dashboard/recruiter/jobs/${jobId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t("backToJob")}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t("title")}
              </h1>
              {job && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {t("for")} <span className="font-medium text-gray-700">{job.title}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="form-select pl-8 w-auto"
            >
              <option value="score">{t("sort.score")}</option>
              <option value="skills">{t("sort.skills")}</option>
              <option value="experience">{t("sort.experience")}</option>
              <option value="semantic">{t("sort.semantic")}</option>
            </select>
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="gap-1.5"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            {refreshing ? t("computing") : t("refresh")}
          </Button>
        </div>
      </div>

      {/* Job context card */}
      {job && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="font-semibold text-gray-900">{job.title}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">{job.location}</span>
            {job.workplaceType && (
              <>
                <span className="text-gray-300">|</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                  {job.workplaceType}
                </span>
              </>
            )}
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-500">
                  {t("requiredSkillsCount", { count: job.requiredSkills.length })}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      {computedAt && !loading && (
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-2">
          <span className="text-xs text-gray-500">
            {cached ? t("cachedResults") : t("freshResults")} •{" "}
            {t("candidateCount", { count: recommendations.length })}
          </span>
          <span className="text-xs text-gray-400">
            {t("computedAt", { date: new Date(computedAt).toLocaleString() })}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-indigo-100" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-indigo-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {t("loading.title")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("loading.subtitle")}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <Inbox className="h-8 w-8 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {t("empty.title")}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              {t("empty.description")}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleRefresh}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {t("empty.cta")}
          </Button>
        </div>
      )}

      {/* Recommendation cards */}
      {!loading && sortedRecommendations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedRecommendations.map((item, idx) => (
            <CandidateRecommendationCard
              key={item.entity_id}
              item={item}
              rank={idx + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
