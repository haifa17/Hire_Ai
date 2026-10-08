import { NextResponse } from "next/server";
import {
  AiEnhancementError,
  AiProviderError,
} from "@/services/ai/enhancement/errors";
import { safeContext, safeString } from "@/services/ai/enhancement/prompt";
import {
  normalizeEnhancementRequest,
  processEnhancementRequest,
} from "@/services/ai/enhancement/service";
import type { EnhanceRequestBody } from "@/services/ai/enhancement/types";

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AiEnhancementError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  if (error instanceof AiProviderError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "Unable to contact the AI providers at the moment." },
    { status: 502 },
  );
}

export async function POST(request: Request) {
  let body: EnhanceRequestBody;

  try {
    body = (await request.json()) as EnhanceRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const target = body.target;
  if (!target) {
    return NextResponse.json(
      { error: "Field 'target' is required." },
      { status: 400 },
    );
  }

  const text = safeString(body.text);
  const context = safeContext(body.context);
  const language = safeString(body.language, 30) || "same as input";

  if (target === "professional_summary" && !text) {
    return NextResponse.json(
      {
        error:
          "Professional summary is empty. Please write text to reformulate.",
      },
      { status: 400 },
    );
  }

  try {
    const payload = await processEnhancementRequest(
      normalizeEnhancementRequest({
        target,
        text,
        context,
        language,
      }),
    );

    return NextResponse.json(payload);
  } catch (error) {
    return toErrorResponse(error);
  }
}
