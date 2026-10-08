import {
  AiEnhancementError,
  AiProviderError,
  isAiProviderError,
} from "./errors";
import { buildEnhancePrompt, getTemperature } from "./prompt";
import { buildEnhanceSuccessPayload } from "./response";
import type {
  EnhanceRequestBody,
  EnhanceTarget,
  NormalizedEnhancementRequest,
} from "./types";
import { createEnhancementProviders } from "../providers";

function getBaseMaxTokens(target: EnhanceTarget): number {
  return target === "professional_summary" ? 300 : 600;
}

function normalizeProviderError(error: unknown): AiEnhancementError {
  if (error instanceof AiEnhancementError) {
    return error;
  }

  if (isAiProviderError(error)) {
    return new AiEnhancementError(error.message, error.status);
  }

  return new AiEnhancementError(
    "Unable to contact the AI providers at the moment.",
    502,
  );
}

export function normalizeEnhancementRequest(
  body: EnhanceRequestBody,
): NormalizedEnhancementRequest {
  return {
    target: body.target as EnhanceTarget,
    text: body.text ?? "",
    context: body.context ?? {},
    language: body.language ?? "same as input",
  };
}

export async function processEnhancementRequest(
  input: NormalizedEnhancementRequest,
): Promise<{ text?: string; skills?: string[] }> {
  const prompt = buildEnhancePrompt({
    target: input.target,
    text: input.text,
    context: input.context,
    language: input.language,
  });

  const providers = createEnhancementProviders();
  if (providers.length === 0) {
    throw new AiEnhancementError(
      "Missing GROQ_API_KEY and OPENROUTER_API_KEY.",
      500,
    );
  }

  let lastError: unknown;

  for (const provider of providers) {
    try {
      const result = await provider.enhance({
        prompt,
        target: input.target,
        baseMaxTokens: getBaseMaxTokens(input.target),
        temperature: getTemperature(input.target),
      });

      return buildEnhanceSuccessPayload({
        target: input.target,
        content: result.content,
        finishReason: result.finishReason,
      });
    } catch (error) {
      lastError = error;

      if (error instanceof AiProviderError && provider.name === "groq") {
        continue;
      }

      break;
    }
  }

  throw normalizeProviderError(lastError);
}
