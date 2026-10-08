import { AiProviderError } from "../enhancement/errors";
import type {
  AiProviderEnhancementRequest,
  AiProviderEnhancementResult,
  AiProviderName,
} from "../enhancement/types";
import {
  extractContentFromPayload,
  type ChatCompletionPayload,
} from "../enhancement/response";

interface OpenAiCompatibleProviderConfig {
  name: AiProviderName;
  label: string;
  endpoint: string;
  apiKey?: string;
  model: string;
  requestTimeoutMs?: number;
  buildHeaders: (apiKey: string) => HeadersInit;
}

interface RequestCompletionParams extends AiProviderEnhancementRequest {
  name: AiProviderName;
  model: string;
  endpoint: string;
  buildHeaders: (apiKey: string) => HeadersInit;
  apiKey: string;
  label: string;
  requestTimeoutMs: number;
  includeRetryInstruction: boolean;
}

const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_RETRY_TOKENS = 1_200;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function readErrorMessage(
  payload: ChatCompletionPayload,
  rawBody: string,
): string {
  const message = payload.error?.message?.trim();
  if (message) {
    return message;
  }

  const trimmedBody = rawBody.trim();
  if (trimmedBody) {
    return trimmedBody.slice(0, 300);
  }

  return "";
}

function classifyStatus(
  status: number,
): "timeout" | "rate_limit" | "unavailable_model" | "request_error" {
  if (status === 429) return "rate_limit";
  if (status === 404) return "unavailable_model";
  if (status === 408) return "timeout";
  return "request_error";
}

async function requestCompletion(
  params: RequestCompletionParams,
): Promise<ChatCompletionPayload> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: params.prompt.system },
    { role: "user", content: params.prompt.user },
  ];

  if (params.includeRetryInstruction) {
    messages.push({
      role: "user",
      content:
        "Previous output was cut off. Regenerate from scratch and return only one complete final answer.",
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    params.requestTimeoutMs,
  );

  try {
    const response = await fetch(params.endpoint, {
      method: "POST",
      headers: params.buildHeaders(params.apiKey),
      signal: controller.signal,
      body: JSON.stringify({
        model: params.model,
        temperature: params.temperature,
        max_tokens: params.includeRetryInstruction
          ? Math.min(params.baseMaxTokens * 2, MAX_RETRY_TOKENS)
          : params.baseMaxTokens,
        messages,
      }),
    });

    const rawBody = await response.text();
    let payload: ChatCompletionPayload = {};

    if (rawBody) {
      try {
        payload = JSON.parse(rawBody) as ChatCompletionPayload;
      } catch {
        payload = {};
      }
    }

    if (!response.ok) {
      const message = readErrorMessage(payload, rawBody);
      throw new AiProviderError({
        provider: params.name,
        code: classifyStatus(response.status),
        message:
          message || `${params.label} request failed while enhancing text.`,
        status: response.status,
      });
    }

    return payload;
  } catch (error) {
    if (isAbortError(error)) {
      throw new AiProviderError({
        provider: params.name,
        code: "timeout",
        message: `${params.label} request timed out after ${params.requestTimeoutMs}ms.`,
        status: 504,
      });
    }

    if (error instanceof AiProviderError) {
      throw error;
    }

    throw new AiProviderError({
      provider: params.name,
      code: "request_error",
      message: `${params.label} request failed while enhancing text.`,
      status: 502,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createOpenAiCompatibleProvider(
  config: OpenAiCompatibleProviderConfig,
) {
  const requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const isConfigured = Boolean(config.apiKey && config.model);

  return {
    name: config.name,
    label: config.label,
    isConfigured,
    async enhance(
      params: AiProviderEnhancementRequest,
    ): Promise<AiProviderEnhancementResult> {
      if (!config.apiKey) {
        throw new AiProviderError({
          provider: config.name,
          code: "missing_api_key",
          message: `${config.label} API key is missing.`,
          status: 500,
        });
      }

      const firstPayload = await requestCompletion({
        ...params,
        name: config.name,
        model: config.model,
        endpoint: config.endpoint,
        buildHeaders: config.buildHeaders,
        apiKey: config.apiKey,
        label: config.label,
        requestTimeoutMs,
        includeRetryInstruction: false,
      });

      const firstContent = extractContentFromPayload(firstPayload).trim();
      const firstFinishReason =
        firstPayload.choices?.[0]?.finish_reason ?? "unknown";

      if (!firstContent && firstFinishReason === "length") {
        const retryPayload = await requestCompletion({
          ...params,
          name: config.name,
          model: config.model,
          endpoint: config.endpoint,
          buildHeaders: config.buildHeaders,
          apiKey: config.apiKey,
          label: config.label,
          requestTimeoutMs,
          includeRetryInstruction: true,
        });

        const retryContent = extractContentFromPayload(retryPayload).trim();
        const retryFinishReason =
          retryPayload.choices?.[0]?.finish_reason ?? "unknown";

        if (!retryContent) {
          throw new AiProviderError({
            provider: config.name,
            code: "empty_response",
            message: `${config.label} returned an empty response after retry.`,
            status: 502,
          });
        }

        return {
          content: retryContent,
          finishReason: retryFinishReason,
        };
      }

      if (!firstContent) {
        throw new AiProviderError({
          provider: config.name,
          code: "empty_response",
          message: `${config.label} returned an empty response.`,
          status: 502,
        });
      }

      return {
        content: firstContent,
        finishReason: firstFinishReason,
      };
    },
  };
}
