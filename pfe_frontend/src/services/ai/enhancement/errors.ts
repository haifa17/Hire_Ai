import type { AiProviderName } from "./types";

export type AiProviderFailureCode =
  | "missing_api_key"
  | "timeout"
  | "rate_limit"
  | "unavailable_model"
  | "empty_response"
  | "request_error"
  | "invalid_response";

export class AiProviderError extends Error {
  readonly provider: AiProviderName;

  readonly code: AiProviderFailureCode;

  readonly status: number;

  constructor(params: {
    provider: AiProviderName;
    code: AiProviderFailureCode;
    message: string;
    status?: number;
  }) {
    super(params.message);
    this.name = "AiProviderError";
    this.provider = params.provider;
    this.code = params.code;
    this.status = params.status ?? 502;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AiEnhancementError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiEnhancementError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isAiProviderError(error: unknown): error is AiProviderError {
  return error instanceof AiProviderError;
}
