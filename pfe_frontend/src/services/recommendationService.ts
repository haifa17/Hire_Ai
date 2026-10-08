import api from "@/lib/api";
import type { RecommendationResponse } from "@/domain/models/Recommendation";

function extractData<T>(payload: unknown): T {
  const asEnvelope = payload as { data?: T };
  return (asEnvelope?.data as T) ?? (payload as T);
}

export const recommendationService = {
  /** Get recommended jobs for a candidate. */
  async getJobRecommendations(
    candidateId: string,
    topK = 10,
    language = "en",
  ): Promise<RecommendationResponse> {
    const response = await api.get(
      `/recommendations/jobs/${candidateId}`,
      { params: { topK, language }, timeout: 120_000 },
    );
    return extractData<RecommendationResponse>(response.data);
  },

  /** Force-refresh job recommendations for a candidate. */
  async refreshJobRecommendations(
    candidateId: string,
    topK = 10,
    language = "en",
  ): Promise<RecommendationResponse> {
    const response = await api.post(
      `/recommendations/jobs/${candidateId}/refresh`,
      {},
      { params: { topK, language }, timeout: 120_000 },
    );
    return extractData<RecommendationResponse>(response.data);
  },

  /** Get recommended candidates for a job offer. */
  async getCandidateRecommendations(
    jobId: string,
    topK = 10,
    language = "en",
  ): Promise<RecommendationResponse> {
    const response = await api.get(
      `/recommendations/candidates/${jobId}`,
      { params: { topK, language }, timeout: 120_000 },
    );
    return extractData<RecommendationResponse>(response.data);
  },

  /** Force-refresh candidate recommendations for a job. */
  async refreshCandidateRecommendations(
    jobId: string,
    topK = 10,
    language = "en",
  ): Promise<RecommendationResponse> {
    const response = await api.post(
      `/recommendations/candidates/${jobId}/refresh`,
      {},
      { params: { topK, language }, timeout: 120_000 },
    );
    return extractData<RecommendationResponse>(response.data);
  },
};
