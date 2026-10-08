"use client";

import { useState } from "react";
import type { RecommendationItem } from "@/domain/models/Recommendation";
import { ScoreBreakdown } from "./ScoreBreakdown";
import {
  MapPin,
  Building2,
  Banknote,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface JobRecommendationCardProps {
  readonly item: RecommendationItem;
  readonly rank: number;
}

function getScoreColor(hasScore: boolean, overallScore: number | null | undefined): string {
  if (!hasScore || overallScore === null || overallScore === undefined) {
    return "text-gray-500 bg-gray-50 ring-gray-400/20";
  }
  if (overallScore >= 80) return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
  if (overallScore >= 60) return "text-blue-700 bg-blue-50 ring-blue-600/20";
  return "text-amber-700 bg-amber-50 ring-amber-600/20";
}

/** Renders a single recommended job card for the candidate dashboard. */
export function JobRecommendationCard({ item, rank }: JobRecommendationCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const meta = item.metadata || {};
  const title = (meta.title as string) || "Untitled Position";
  const company = (meta.company as string) || "";
  const location = (meta.location as string) || "";
  const workplaceType = (meta.workplace_type as string) || "";
  const salaryMin = meta.salary_min as number | undefined;
  const salaryMax = meta.salary_max as number | undefined;
  const currency = (meta.currency as string) || "USD";
  const skills = (meta.required_skills as string[]) || [];
  const entityId = item.entity_id;

  const hasScore = item.overall_score !== null && item.overall_score !== undefined;
  const scoreColor = getScoreColor(hasScore, item.overall_score);

  const companyInitial = company ? company[0].toUpperCase() : "?";
  const logoBg = rank <= 3
    ? ["bg-blue-600", "bg-indigo-600", "bg-violet-600"][rank - 1]
    : "bg-gray-700";

  function formatSalary(min?: number, max?: number, cur = "USD"): string {
    if (!min && !max) return "";
    const fmt = (n: number) =>
      n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)} ${cur}`;
    if (max) return `Up to ${fmt(max)} ${cur}`;
    return `From ${fmt(min!)} ${cur}`;
  }

  return (
    <div className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-11 w-11 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold text-white ${logoBg}`}
            >
              {companyInitial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {title}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                {company && (
                  <>
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{company}</span>
                  </>
                )}
                {location && (
                  <>
                    <span className="text-gray-300">•</span>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{location}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Score badge */}
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset font-mono ${scoreColor}`}
          >
            {hasScore ? `${Math.round(item.overall_score!)}%` : "Not evaluated"}
          </span>
        </div>

        {/* Workplace badge + salary */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {workplaceType && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
              {workplaceType}
            </span>
          )}
          {formatSalary(salaryMin, salaryMax, currency) && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
              <Banknote className="h-3 w-3" />
              {formatSalary(salaryMin, salaryMax, currency)}
            </span>
          )}
        </div>

        {/* Skill tags */}
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-600 uppercase"
              >
                {skill}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="text-[10px] text-gray-400 self-center">
                +{skills.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Explanation preview */}
        {item.explanation && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50/50 p-2.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed ">
              {item.explanation}
            </p>
          </div>
        )}

        {/* Expand / collapse */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showDetails ? (
            <>
              Hide details <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              View score details <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>

        {/* Score breakdown (expanded) */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <ScoreBreakdown breakdown={item.breakdown} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
        <span className="text-xs text-gray-400 font-medium">Rank #{rank}</span>
        <Link
          href={`/dashboard/candidate/jobs/${entityId}`}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Job <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
