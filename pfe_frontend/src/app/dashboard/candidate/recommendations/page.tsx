"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import { recommendationService } from "@/services/recommendationService";
import { JobRecommendationCard } from "@/components/recommendations/JobRecommendationCard";
import type { RecommendationItem, RecommendationResponse } from "@/domain/models/Recommendation";
import {
  Sparkles,
  RefreshCcw,
  Loader2,
  Inbox,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

type SortBy = "score" | "skills" | "semantic" | "experience";

export default function CandidateRecommendationsPage() {
  const t = useTranslations("candidateDashboard.recommendations");
  const { user } = useAuthStore();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState<string>("");
  const [cached, setCached] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("score");

  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const candidateId = user?.id ?? "";

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const applyRecommendationResponse = useCallback((res: RecommendationResponse) => {
    const list = res.recommendations || [];
    setRecommendations(list);
    setComputedAt(res.computed_at || "");
    setCached(res.cached ?? false);
    setIsGenerating(Boolean(res.generating));
    return list;
  }, []);

  const fetchRecommendations = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await recommendationService.getJobRecommendations(candidateId);
      const list = applyRecommendationResponse(res);

      // If no recommendations in DB and background generation triggered
      if (list.length === 0 && (res.generating || res.cached === false)) {
        setIsGenerating(true);
        stopPolling();
        pollCountRef.current = 0;

        pollTimerRef.current = setInterval(async () => {
          pollCountRef.current += 1;
          try {
            const pollRes = await recommendationService.getJobRecommendations(candidateId);
            const polledList = pollRes.recommendations || [];
            if (polledList.length > 0) {
              applyRecommendationResponse(pollRes);
              setIsGenerating(false);
              stopPolling();
              toast.success(t("recommendationsReady"));
            } else if (pollCountRef.current >= 8) {
              // Stop polling after 40s
              stopPolling();
              setIsGenerating(false);
            }
          } catch {
            // Ignore polling errors
          }
        }, 5000);
      }
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [applyRecommendationResponse, candidateId, stopPolling, t]);

  const handleRefresh = async () => {
    if (!candidateId) return;
    stopPolling();
    setRefreshing(true);
    setError(null);
    try {
      const res = await recommendationService.refreshJobRecommendations(candidateId);
      applyRecommendationResponse({ ...res, cached: false });
      toast.success(t("refreshSuccess"));
    } catch {
      setError(t("refreshError"));
      toast.error(t("refreshFailedToast"));
    } finally {
      setRefreshing(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const runFetch = () => {
      void fetchRecommendations();
    };
    runFetch();
    return () => {
      stopPolling();
    };
  }, [fetchRecommendations, stopPolling]);

  // Sort recommendations. `overall_score`/breakdown values can be `null`
  // (criterion unavailable) — treated as lowest priority rather than
  // crashing the comparator.
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    switch (sortBy) {
      case "skills":
        return (b.breakdown.skills ?? -1) - (a.breakdown.skills ?? -1);
      case "semantic":
        return (b.breakdown.semantic ?? -1) - (a.breakdown.semantic ?? -1);
      case "experience":
        return (b.breakdown.experience ?? -1) - (a.breakdown.experience ?? -1);
      default:
        return (b.overall_score ?? -1) - (a.overall_score ?? -1);
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-500/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {t("recommendedJobs")}
              </h1>
              <p className="text-xs font-medium text-gray-500">
                {t("headerSubtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="form-select pl-9 w-auto"
            >
              <option value="score">{t("sortOverallScore")}</option>
              <option value="skills">{t("sortSkillsMatch")}</option>
              <option value="semantic">{t("sortSemanticFit")}</option>
              <option value="experience">{t("sortExperienceFit")}</option>
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Always visible Manual Refresh button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {refreshing ? t("computingAi") : t("refreshRecommendations")}
          </Button>
        </div>
      </div>

      {/* Background AI generation in progress alert */}
      {isGenerating && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-blue-900 shadow-sm">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-blue-900">
              {t("generatingInBackground")}
            </p>
            <p className="text-blue-700 mt-0.5">
              {t("generatingInBackgroundHint")}
            </p>
          </div>
        </div>
      )}

      {/* Status bar */}
      {computedAt && !loading && !isGenerating && recommendations.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-medium text-gray-600">
              {cached ? t("loadedFromDatabase") : t("freshlyGenerated")} •{" "}
              <strong className="text-gray-900">{t("matchCount", { count: recommendations.length })}</strong>
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {t("computedAt", { date: new Date(computedAt).toLocaleString() })}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-xs">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-t-blue-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {t("checkingRecommendations")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("analyzingProfile")}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !isGenerating && recommendations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-xs">
            <Inbox className="h-8 w-8 text-gray-400" />
          </div>
          <div className="text-center max-w-sm">
            <p className="text-base font-bold text-gray-900">
              {t("noRecommendationsYet")}
            </p>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              {t("noRecommendationsHint")}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-2 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {t("generateAiRecommendations")}
          </Button>
        </div>
      )}

      {/* Recommendation cards */}
      {!loading && sortedRecommendations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sortedRecommendations.map((item, idx) => (
            <JobRecommendationCard
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
