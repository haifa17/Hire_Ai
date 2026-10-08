export interface ATSScoreBreakdownDto {
  keywordMatch: number;
  skillsMatch: number;
  experienceRelevance: number;
  formattingQuality: number;
  educationMatch: number;
}

export interface ATSScoreDto {
  overall: number;
  breakdown: ATSScoreBreakdownDto;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}
