import { getApiErrorMessage } from "@/lib/api-error";

type EnhanceTarget =
  | "professional_summary"
  | "experience_description"
  | "education_description"
  | "project_description"
  | "company_description";

interface EnhanceTextInput {
  target: EnhanceTarget;
  text: string;
  context?: Record<string, unknown>;
  language?: string;
}

interface SuggestSkillsInput {
  context?: Record<string, unknown>;
  language?: string;
}

const FALLBACK_ERROR = "AI enhancement failed.";

type EnhanceResponse = {
  error?: string;
  text?: string;
  skills?: string[];
};

async function postEnhance(payload: {
  target: EnhanceTarget | "suggested_skills";
  text?: string;
  context?: Record<string, unknown>;
  language?: string;
}) {
  let response: Response;
  try {
    response = await fetch("/api/ai/enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // fetch only rejects when the request never got an answer.
    throw new Error(getApiErrorMessage({ code: "ERR_NETWORK" }, FALLBACK_ERROR));
  }

  const data = (await response.json().catch(() => ({}))) as EnhanceResponse;

  if (!response.ok) {
    // A 400 carries the route's own explanation ("…is empty"). Anything else
    // comes from the AI providers and is not meant for users, so it is
    // reported as the service being unavailable.
    const status = response.status === 400 || response.status === 429 ? response.status : 503;
    throw new Error(
      getApiErrorMessage({ response: { status, data: { message: data.error } } }, FALLBACK_ERROR),
    );
  }

  return data;
}

export const aiEnhanceService = {
  async enhanceText(input: EnhanceTextInput): Promise<string> {
    const data = await postEnhance({
      target: input.target,
      text: input.text,
      context: input.context,
      language: input.language,
    });

    if (!data.text) {
      throw new Error("No enhanced text returned by AI.");
    }

    return data.text;
  },

  async suggestSkills(input: SuggestSkillsInput): Promise<string[]> {
    const data = await postEnhance({
      target: "suggested_skills",
      context: input.context,
      language: input.language,
    });

    return Array.isArray(data.skills) ? data.skills : [];
  },
};
