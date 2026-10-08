export interface ATSScoreBreakdown {
  keywordMatch: number;
  skillsMatch: number;
  experienceRelevance: number;
  formattingQuality: number;
  educationMatch: number;
}

export interface ATSScore {
  overall: number;
  breakdown: ATSScoreBreakdown;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

export type ATSScoreResult = ATSScore;
