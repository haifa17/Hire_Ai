"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { BarChart3, RefreshCw, Sparkles, X } from "lucide-react";
import { ATSScore } from "@/domain/models/ATSScore";

interface AtsScorePanelProps {
  readonly resumeId: string;
  readonly score: ATSScore | null;
  readonly loading: boolean;
  readonly optimizing?: boolean;
  readonly onRescore: (resumeId: string) => Promise<void> | void;
  readonly onOptimizeCv?: () => Promise<void> | void;
  readonly onClose: () => void;
}

const getScoreTone = (value: number) => {
  if (value >= 70) return "emerald";
  if (value >= 50) return "amber";
  return "rose";
};

const getProgressColor = (value: number) => {
  if (value >= 70) return "#10b981";
  if (value >= 50) return "#f59e0b";
  return "#f43f5e";
};

const getBarColorClass = (value: number) => {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-500";
  return "bg-rose-500";
};

function getMatchLevelLabel(
  overall: number,
  t: (key: string) => string,
): string {
  if (overall >= 70) return t("matchLevel.strong");
  if (overall >= 50) return t("matchLevel.needsRefinement");
  return t("matchLevel.atRisk");
}

function SuggestionsList({
  suggestions,
  emptyLabel,
}: Readonly<{ suggestions: string[]; emptyLabel: string }>) {
  if (suggestions.length === 0) {
    return <li className="text-sm text-slate-400">{emptyLabel}</li>;
  }
  return (
    <>
      {suggestions.map((suggestion, index) => (
        <li
          key={suggestion}
          className="flex gap-3 text-sm leading-6 text-slate-600"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
            {index + 1}
          </span>
          <span>{suggestion}</span>
        </li>
      ))}
    </>
  );
}

function KeywordChips({
  keywords,
  emptyLabel,
  toneClass,
}: Readonly<{
  keywords: string[];
  emptyLabel: string;
  toneClass: string;
}>) {
  if (keywords.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  }
  return (
    <>
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}
        >
          {keyword}
        </span>
      ))}
    </>
  );
}

function NoScoreEmptyState({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
        <BarChart3 className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function OptimizeCard({
  loading,
  optimizing,
  onOptimizeCv,
  t,
}: Readonly<{
  loading: boolean;
  optimizing: boolean;
  onOptimizeCv: () => Promise<void> | void;
  t: (key: string) => string;
}>) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-5 text-white shadow-xl shadow-blue-950/20">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
        {t("optimizeCard.badge")}
      </div>
      <h4 className="mt-1 text-sm font-bold text-white">
        {t("optimizeCard.title")}
      </h4>
      <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
        {t("optimizeCard.description")}
      </p>
      <button
        type="button"
        onClick={onOptimizeCv}
        disabled={loading || optimizing}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-indigo-600 disabled:opacity-60"
      >
        {optimizing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-white" />
        ) : (
          <Sparkles className="h-4 w-4 text-amber-300" />
        )}
        {optimizing ? t("optimizeCard.optimizing") : t("optimizeCard.button")}
      </button>
    </div>
  );
}

const toneClasses: Record<
  string,
  { ring: string; text: string; soft: string }
> = {
  emerald: {
    ring: "from-emerald-400 to-emerald-600",
    text: "text-emerald-700",
    soft: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  amber: {
    ring: "from-amber-400 to-amber-600",
    text: "text-amber-700",
    soft: "bg-amber-50 text-amber-800 border-amber-100",
  },
  rose: {
    ring: "from-rose-400 to-rose-600",
    text: "text-rose-700",
    soft: "bg-rose-50 text-rose-700 border-rose-100",
  },
};

export function AtsScorePanel({
  resumeId,
  score,
  loading,
  optimizing = false,
  onRescore,
  onOptimizeCv,
  onClose,
}: AtsScorePanelProps) {
  const t = useTranslations("resumesEditor.atsScorePanel");
  const BREAKDOWN_LABELS: Record<keyof ATSScore["breakdown"], string> = {
    keywordMatch: t("breakdown.keywordMatch"),
    skillsMatch: t("breakdown.skillsMatch"),
    experienceRelevance: t("breakdown.experienceRelevance"),
    formattingQuality: t("breakdown.formattingQuality"),
    educationMatch: t("breakdown.educationMatch"),
  };
  const overall = score?.overall ?? 0;
  const tone = toneClasses[getScoreTone(overall)];
  const progressStyle = {
    background: `conic-gradient(${getProgressColor(overall)} ${overall * 3.6}deg, rgba(15,23,42,0.08) 0deg)`,
  };

  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[430px] flex-col border-l border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              {t("title")}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {!score ? (
          <NoScoreEmptyState
            title={t("noScoreYet.title")}
            description={t("noScoreYet.description")}
          />
        ) : (
          <div className="space-y-5">
            {/* AI Full Optimization Action Card */}
            {onOptimizeCv && (
              <OptimizeCard
                loading={loading}
                optimizing={optimizing}
                onOptimizeCv={onOptimizeCv}
                t={t}
              />
            )}

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    {t("overall")}
                  </p>
                  <h3 className={`mt-1 text-3xl font-black ${tone.text}`}>
                    {score.overall}
                  </h3>
                </div>
                <div className="relative h-28 w-28 shrink-0">
                  <div
                    className="absolute inset-0 rounded-full p-2"
                    style={progressStyle}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
                      <div className="text-center">
                        <div className="text-2xl font-black text-slate-900">
                          {score.overall}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          ATS
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone.soft}`}
              >
                {getMatchLevelLabel(score.overall, t)}
              </div>
            </section>

            <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">
                  {t("breakdownTitle")}
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t("overallPercent", { score: score.overall })}
                </span>
              </div>
              <div className="space-y-3">
                {(
                  Object.keys(score.breakdown) as Array<
                    keyof ATSScore["breakdown"]
                  >
                ).map((key) => {
                  const value = score.breakdown[key];
                  return (
                    <div key={key}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">
                          {BREAKDOWN_LABELS[key]}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {value}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${getBarColorClass(value)}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-slate-900">
                {t("matchedKeywords")}
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                <KeywordChips
                  keywords={score.matchedKeywords}
                  emptyLabel={t("noMatchedKeywords")}
                  toneClass="border-emerald-100 bg-emerald-50 text-emerald-700"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-slate-900">
                {t("missingKeywords")}
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                <KeywordChips
                  keywords={score.missingKeywords}
                  emptyLabel={t("noMissingKeywords")}
                  toneClass="border-rose-100 bg-rose-50 text-rose-700"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-slate-900">
                {t("aiSuggestions")}
              </h4>
              <ol className="mt-3 space-y-3">
                <SuggestionsList
                  suggestions={score.suggestions}
                  emptyLabel={t("noSuggestions")}
                />
              </ol>
            </section>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-5 py-4">
        <button
          type="button"
          onClick={() => onRescore(resumeId)}
          disabled={loading || optimizing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {loading ? t("rescoring") : t("rescore")}
        </button>
      </div>
    </aside>
  );
}
