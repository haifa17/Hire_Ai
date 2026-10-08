export type EnhanceTarget =
  | "professional_summary"
  | "experience_description"
  | "education_description"
  | "project_description"
  | "company_description"
  | "suggested_skills";

export interface EnhanceRequestBody {
  target?: EnhanceTarget;
  text?: string;
  context?: Record<string, unknown>;
  language?: string;
}

export interface NormalizedEnhancementRequest {
  target: EnhanceTarget;
  text: string;
  context: Record<string, unknown>;
  language: string;
}

export interface AiEnhancementPrompt {
  system: string;
  user: string;
}

export interface AiProviderEnhancementRequest {
  prompt: AiEnhancementPrompt;
  target: EnhanceTarget;
  baseMaxTokens: number;
  temperature: number;
}

export interface AiProviderEnhancementResult {
  content: string;
  finishReason: string;
}

export type AiProviderName = "groq" | "openrouter";
