/** Domain model for the recommendation system. */

/**
 * Unified 7-criterion breakdown, shared verbatim with the matching pipeline
 * (see backend/ai-service/app/schemas/scoring.py::UnifiedBreakdownSchema).
 * Each value is a 0-1 fraction, or `null` when the criterion could not be
 * evaluated (missing requirement or missing candidate/job data) — render
 * `null` as "Not evaluated" rather than coercing it to 0.
 */
export interface RecommendationScoreBreakdown {
  skills: number | null;
  experience: number | null;
  semantic: number | null;
  education: number | null;
  projects: number | null;
  languages: number | null;
  certifications: number | null;
}

export interface RecommendationItem {
  rank: number;
  entity_id: string;
  entity_type: "job" | "candidate";
  /** 0-100 scale, or `null` when no criterion was available at all. */
  overall_score: number | null;
  breakdown: RecommendationScoreBreakdown;
  unavailable_criteria?: string[];
  explanation: string;
  metadata: Record<string, unknown>;
}

export interface RecommendationResponse {
  request_id: string;
  source_id: string;
  source_type: "candidate" | "job";
  recommendations: RecommendationItem[];
  computed_at: string;
  cached: boolean;
  generating?: boolean;
}
