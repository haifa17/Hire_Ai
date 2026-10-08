"use client";

import { useState } from "react";
import type { RecommendationScoreBreakdown } from "@/domain/models/Recommendation";
import { ChevronDown, ChevronUp } from "lucide-react";

const SIGNAL_META: Record<
  keyof RecommendationScoreBreakdown,
  { label: string; color: string; bg: string }
> = {
  skills: { label: "Skills", color: "text-emerald-600", bg: "bg-emerald-500" },
  experience: { label: "Experience", color: "text-amber-600", bg: "bg-amber-500" },
  semantic: { label: "Profile Match", color: "text-blue-600", bg: "bg-blue-500" },
  education: { label: "Education", color: "text-purple-600", bg: "bg-purple-500" },
  projects: { label: "Projects", color: "text-indigo-600", bg: "bg-indigo-500" },
  languages: { label: "Languages", color: "text-rose-600", bg: "bg-rose-500" },
  certifications: { label: "Certifications", color: "text-cyan-600", bg: "bg-cyan-500" },
};

interface ScoreBreakdownProps {
  readonly breakdown: RecommendationScoreBreakdown;
  readonly className?: string;
}

export function ScoreBreakdown({ breakdown, className = "" }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  const entries = Object.entries(SIGNAL_META) as [
    keyof RecommendationScoreBreakdown,
    (typeof SIGNAL_META)[keyof RecommendationScoreBreakdown],
  ][];

  // Show top 4 when collapsed, all when expanded
  const visible = expanded ? entries : entries.slice(0, 4);

  return (
    <div className={className}>
      <div className="space-y-2">
        {visible.map(([key, meta]) => {
          const raw = breakdown[key];
          const notEvaluated = raw === null || raw === undefined;
          const pct = notEvaluated ? 0 : Math.min(raw * 100, 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className={`text-xs font-medium w-24 truncate ${meta.color}`}>
                {meta.label}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                {!notEvaluated && (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${meta.bg}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <span className="text-xs font-mono text-gray-500 w-24 text-right">
                {notEvaluated ? "Not evaluated" : `${Math.round(pct)}%`}
              </span>
            </div>
          );
        })}
      </div>
      {entries.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {expanded ? (
            <>Show less <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Show all signals <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
