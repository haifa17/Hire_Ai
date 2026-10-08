"use client";

import { useState } from "react";
import type { RecommendationItem } from "@/domain/models/Recommendation";
import { ScoreBreakdown } from "./ScoreBreakdown";
import {
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  Clock,
  Globe,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface CandidateRecommendationCardProps {
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

/** Renders a single recommended candidate card for the recruiter dashboard. */
export function CandidateRecommendationCard({ item, rank }: CandidateRecommendationCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const meta = item.metadata || {};
  const name = (meta.name as string) || "Unknown Candidate";
  const desiredPosition = (meta.desired_position as string) || "";
  const location = (meta.location as string) || "";
  const experienceYears = meta.experience_years as number | undefined;
  const educationLevel = (meta.education_level as string) || "";
  const skills = (meta.skills as string[]) || [];
  const languages = (meta.languages as string[]) || [];
  const openToWork = meta.open_to_work as boolean;
  const entityId = item.entity_id;

  const hasScore = item.overall_score !== null && item.overall_score !== undefined;
  const scoreColor = getScoreColor(hasScore, item.overall_score);

  // Generate initials from name
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarBg = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
  ][rank % 10];

  return (
    <div className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-12 w-12 shrink-0 rounded-full border flex items-center justify-center font-bold text-sm ${avatarBg}`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                {openToWork && (
                  <span className="flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Open
                  </span>
                )}
              </div>
              {desiredPosition && (
                <p className="text-xs text-gray-500 truncate">{desiredPosition}</p>
              )}
            </div>
          </div>

          {/* Score badge */}
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset font-mono ${scoreColor}`}
          >
            {hasScore ? `${Math.round(item.overall_score!)}%` : "Not evaluated"}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-gray-500">
          {experienceYears !== undefined && experienceYears > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {experienceYears}y exp
            </span>
          )}
          {educationLevel && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              {educationLevel}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {languages.length > 0 && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {languages.slice(0, 3).join(", ")}
            </span>
          )}
        </div>

        {/* Skill tags */}
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 6).map((skill) => (
              <span
                key={skill}
                className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-600 uppercase"
              >
                {skill}
              </span>
            ))}
            {skills.length > 6 && (
              <span className="text-[10px] text-gray-400 self-center">
                +{skills.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Explanation */}
        {item.explanation && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-indigo-50/50 p-2.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-500 mt-0.5" />
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
            <>Hide details <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>View score details <ChevronDown className="h-3 w-3" /></>
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
        <span className="text-xs text-gray-400 font-medium">
          Rank #{rank}
        </span>
        <Link
          href={`/dashboard/recruiter/candidates/${entityId}`}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Profile <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
