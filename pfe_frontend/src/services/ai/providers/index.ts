import { safeString } from "../enhancement/prompt";
import { createOpenAiCompatibleProvider } from "./openAiCompatibleProvider";

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-oss-20b";

export function createEnhancementProviders() {
  return [
    createOpenAiCompatibleProvider({
      name: "groq",
      label: "Groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: process.env.GROQ_API_KEY,
      model: safeString(process.env.GROQ_MODEL, 100) || DEFAULT_GROQ_MODEL,
      buildHeaders: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      }),
    }),
    createOpenAiCompatibleProvider({
      name: "openrouter",
      label: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: process.env.OPENROUTER_API_KEY,
      model:
        safeString(process.env.OPENROUTER_MODEL, 100) ||
        DEFAULT_OPENROUTER_MODEL,
      buildHeaders: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
        "X-Title": "smart-cv-platform-frontend",
      }),
    }),
  ].filter((provider) => provider.isConfigured);
}
