import type { AiEnhancementPrompt, EnhanceTarget } from "./types";

export const MAX_TEXT_LENGTH = 4_000;

export function safeString(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function safeContext(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function buildEnhancePrompt(params: {
  target: EnhanceTarget;
  text: string;
  context: Record<string, unknown>;
  language: string;
}): AiEnhancementPrompt {
  const contextJson = JSON.stringify(params.context);
  const outputLanguage =
    params.language === "same as input" ? "input language" : params.language;

  if (params.target === "suggested_skills") {
    return {
      system:
        'You are a senior talent strategist and ATS optimization expert. Return only valid minified JSON with this exact shape: {"skills":["skill 1","skill 2"]}. No markdown, no extra keys, no explanation.',
      user:
        `Task: Generate specialized suggested skills for this candidate profile.\n` +
        `Rules:\n` +
        `- Produce 8 to 12 skills.\n` +
        `- Prioritize role-relevant hard skills first, then complementary soft skills.\n` +
        `- Avoid duplicates and avoid skills already present in candidate profile.\n` +
        `- Each skill must be concise (1 to 3 words).\n` +
        `- Use language: ${outputLanguage}.\n` +
        `Candidate context JSON: ${contextJson}`,
    };
  }

  const sharedSystem =
    "You are a world-class CV writer and recruiter coach. Return only the final content, no markdown, no title, no quotes, and no meta commentary.";

  const sharedRules =
    `Global rules:\n` +
    `- Keep language: ${outputLanguage}.\n` +
    `- Be concrete and outcome-oriented.\n` +
    `- Prefer action verbs and measurable impact when possible.\n` +
    `- Avoid buzzwords, repetition, and generic filler.\n` +
    `- Use ATS-friendly wording.\n`;

  if (params.target === "professional_summary") {
    return {
      system: sharedSystem,
      user:
        `Task: Reformulate the existing Professional Summary with better expression and fluency only.\n` +
        sharedRules +
        `Section rules:\n` +
        `- Keep the same meaning and the same facts. Do not invent anything new.\n` +
        `- Keep approximately the same length (+/- 20%).\n` +
        `- Improve clarity, grammar, and professional tone.\n` +
        `- Return one complete final text with a complete last sentence.\n` +
        `Current summary: ${params.text || "(empty)"}\n` +
        `Profile context JSON: ${contextJson}`,
    };
  }

  if (params.target === "experience_description") {
    return {
      system: sharedSystem,
      user:
        `Task: Rewrite or generate a specialized Experience Description and Achievements block.\n` +
        sharedRules +
        `Section rules:\n` +
        `- Focus on responsibilities, ownership, and outcomes.\n` +
        `- Mention metrics if inferable from context, otherwise keep claims realistic.\n` +
        `- Keep it to 3 to 6 concise lines separated by line breaks.\n` +
        `Current experience text: ${params.text || "(empty)"}\n` +
        `Profile context JSON: ${contextJson}`,
    };
  }

  if (params.target === "education_description") {
    return {
      system: sharedSystem,
      user:
        `Task: Rewrite or generate a specialized Education Description.\n` +
        sharedRules +
        `Section rules:\n` +
        `- Highlight relevant coursework, honors, thesis, leadership, or notable activities.\n` +
        `- Connect academic achievements to employability and target role.\n` +
        `- Keep it concise: 2 to 4 lines.\n` +
        `Current education text: ${params.text || "(empty)"}\n` +
        `Profile context JSON: ${contextJson}`,
    };
  }

  if (params.target === "company_description") {
    return {
      system: sharedSystem,
      user:
        `Task: Reformulate the existing Company Description for a recruiter profile.\n` +
        sharedRules +
        `Section rules:\n` +
        `- Keep the same meaning and the same facts. Do not invent details.\n` +
        `- Keep approximately the same length (+/- 20%).\n` +
        `- Improve clarity, tone, and attractiveness for candidates.\n` +
        `- Mention mission/culture only if present in the original text.\n` +
        `- Return one complete final paragraph.\n` +
        `Current company description: ${params.text || "(empty)"}\n` +
        `Profile context JSON: ${contextJson}`,
    };
  }

  return {
    system: sharedSystem,
    user:
      `Task: Rewrite or generate a specialized Project Description.\n` +
      sharedRules +
      `Section rules:\n` +
      `- Include: problem, your role, solution/tech, and impact/result.\n` +
      `- Keep strong technical clarity without hype.\n` +
      `- Keep it concise: 3 to 5 lines.\n` +
      `Current project text: ${params.text || "(empty)"}\n` +
      `Profile context JSON: ${contextJson}`,
  };
}

export function getTemperature(target: EnhanceTarget): number {
  return target === "professional_summary" ? 0.2 : 0.4;
}
