import api from "@/lib/api";
import type {
  MatchOfferRequest,
  MatchOfferResponse,
} from "@/domain/models/OfferMatch";

function extractData<T>(payload: unknown): T {
  const asEnvelope = payload as { data?: T };
  return (asEnvelope?.data as T) ?? (payload as T);
}

// The AI pipeline (LLM structuring + embeddings) can take a while, much longer
// than the default axios timeout in lib/api.ts.
const MATCH_TIMEOUT_MS = 120_000;

export const offerMatchService = {
  async matchOffer(request: MatchOfferRequest): Promise<MatchOfferResponse> {
    const response = await api.post("/applications/match-offer", request, {
      timeout: MATCH_TIMEOUT_MS,
    });
    return extractData<MatchOfferResponse>(response.data);
  },
};
