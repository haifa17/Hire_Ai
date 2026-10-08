import { safeString } from "./prompt";

export interface ChatCompletionChoice {
  message?: { content?: unknown };
  text?: unknown;
  finish_reason?: string;
}

export interface ChatCompletionPayload {
  error?: { message?: string };
  choices?: ChatCompletionChoice[];
}

export function extractContentFromMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return safeString(content, 6_000);
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (!part || typeof part !== "object") {
          return "";
        }

        const typedPart = part as { text?: unknown; type?: unknown };
        if (typedPart.type === "text" && typeof typedPart.text === "string") {
          return typedPart.text;
        }

        if (typeof typedPart.text === "string") {
          return typedPart.text;
        }

        return "";
      })
      .join("\n");

    return safeString(joined, 6_000);
  }

  return "";
}

export function extractContentFromPayload(
  payload: ChatCompletionPayload,
): string {
  const firstChoice = payload.choices?.[0];

  const messageContent = extractContentFromMessageContent(
    firstChoice?.message?.content,
  );
  if (messageContent) {
    return messageContent;
  }

  if (typeof firstChoice?.text === "string") {
    return safeString(firstChoice.text, 6_000);
  }

  return "";
}

export function parseSkills(content: string): string[] {
  const trimmed = content.trim();

  try {
    const parsed = JSON.parse(trimmed) as { skills?: unknown };
    if (Array.isArray(parsed.skills)) {
      return parsed.skills
        .map((skill) => safeString(skill, 80))
        .filter(Boolean)
        .slice(0, 12);
    }
  } catch {
    // Fall through to list parsing.
  }

  return trimmed
    .split(/[\n,;]/g)
    .map((part) => part.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function ensureCompleteSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  if (/[.!?]$/.test(trimmed)) {
    return trimmed;
  }

  const lastPunctuationIndex = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf("!"),
    trimmed.lastIndexOf("?"),
  );

  if (lastPunctuationIndex >= 0) {
    return trimmed.slice(0, lastPunctuationIndex + 1).trim();
  }

  return `${trimmed}.`;
}

export function buildEnhanceSuccessPayload(params: {
  target:
    | "professional_summary"
    | "experience_description"
    | "education_description"
    | "project_description"
    | "company_description"
    | "suggested_skills";
  content: string;
  finishReason: string;
}): { text?: string; skills?: string[] } {
  if (params.target === "suggested_skills") {
    const uniqueSkills = Array.from(new Set(parseSkills(params.content)));
    return { skills: uniqueSkills };
  }

  let finalText = params.content;
  if (params.target === "professional_summary") {
    finalText = ensureCompleteSentence(finalText);
  }
  if (params.finishReason === "length") {
    finalText = ensureCompleteSentence(finalText);
  }

  return { text: finalText };
}
