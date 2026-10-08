import type {
  CreateInterviewPayload,
  Interview,
  RecruiterAvailability,
  UpdateInterviewPayload,
} from "@/domain/models/Interview";
import api from "@/lib/api";

function extractData<T>(payload: unknown): T {
  const asEnvelope = payload as { data?: T };
  return (asEnvelope?.data as T) ?? (payload as T);
}

export const interviewService = {
  async getMine(): Promise<Interview[]> {
    const response = await api.get("/interviews/me");
    return extractData<Interview[]>(response.data);
  },

  async create(payload: CreateInterviewPayload): Promise<Interview> {
    const response = await api.post("/interviews", payload);
    return extractData<Interview>(response.data);
  },

  async getById(id: string): Promise<Interview> {
    const response = await api.get(`/interviews/${id}`);
    return extractData<Interview>(response.data);
  },

  async update(
    id: string,
    payload: UpdateInterviewPayload,
  ): Promise<Interview> {
    const response = await api.patch(`/interviews/${id}`, payload);
    return extractData<Interview>(response.data);
  },

  async remove(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/interviews/${id}`);
    return extractData<{ message: string }>(response.data);
  },

  async getRecruiterAvailability(
    recruiterId: string,
    params: { from?: string; to?: string } = {},
  ): Promise<RecruiterAvailability> {
    const response = await api.get(`/recruiters/${recruiterId}/availability`, {
      params,
    });
    return extractData<RecruiterAvailability>(response.data);
  },
};
