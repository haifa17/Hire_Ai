/** A job offer found outside the platform, pasted in by the candidate. */
export interface ExternalOffer {
  title: string;
  company?: string;
  location?: string;
  description: string;
}

/** Exactly one of `jobOfferId` / `externalOffer` must be set. */
export interface MatchOfferRequest {
  jobOfferId?: string;
  externalOffer?: ExternalOffer;
  language?: "en" | "fr";
}

export const MATCH_CRITERIA = [
  "skills",
  "experience",
  "semantic",
  "education",
  "projects",
  "languages",
  "certifications",
] as const;

export type MatchCriterion = (typeof MATCH_CRITERIA)[number];

/**
 * Subset of the AI service's MatchingResultSchema used by the UI.
 * Breakdown values are 0–1 fractions; `null` means the criterion could not be
 * evaluated (missing data), which is not the same as a score of 0.
 */
export interface OfferMatchResult {
  globalScore: number | null;
  breakdown: Partial<Record<MatchCriterion, number | null>>;
  unavailableCriteria?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
  strengths?: string[];
  gaps?: string[];
  explanation?: string;
  jobSummary?: string;
}

export interface MatchOfferResponse {
  source: "platform" | "external";
  offer: { id: string | null; title: string; company: string };
  result: OfferMatchResult;
}
