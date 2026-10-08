import api from "@/lib/api";
import type {
  AiGeneratedJobOffer,
  JobOffer,
  JobOfferAnalytics,
  JobOfferFilters,
  JobOfferFormPayload,
  JobOfferListResponse,
} from "@/domain/models/JobOffer";

function extractData<T>(payload: unknown): T {
  const asEnvelope = payload as { data?: T };
  return (asEnvelope?.data as T) ?? (payload as T);
}

export const jobOfferService = {
  async create(data: JobOfferFormPayload): Promise<JobOffer> {
    const response = await api.post("/job-offers", data);
    return extractData<JobOffer>(response.data);
  },

  async aiGenerate(prompt: string): Promise<AiGeneratedJobOffer> {
    const response = await api.post("/job-offers/ai-generate", { prompt });
    return extractData<AiGeneratedJobOffer>(response.data);
  },

  async listPublic(
    filters: JobOfferFilters = {},
  ): Promise<JobOfferListResponse> {
    const response = await api.get("/job-offers", { params: filters });
    return extractData<JobOfferListResponse>(response.data);
  },

  async listMyCompany(
    filters: JobOfferFilters = {},
  ): Promise<JobOfferListResponse> {
    const response = await api.get("/job-offers/company/me", {
      params: filters,
    });
    return extractData<JobOfferListResponse>(response.data);
  },

  async listAdmin(
    filters: JobOfferFilters = {},
  ): Promise<JobOfferListResponse> {
    const response = await api.get("/job-offers/admin", {
      params: filters,
    });
    return extractData<JobOfferListResponse>(response.data);
  },

  async getById(id: string): Promise<JobOffer> {
    const response = await api.get(`/job-offers/${id}`);
    return extractData<JobOffer>(response.data);
  },

  async getPublicById(id: string): Promise<JobOffer> {
    const response = await api.get(`/job-offers/public/${id}`);
    return extractData<JobOffer>(response.data);
  },

  async getBySlug(slug: string): Promise<JobOffer> {
    const response = await api.get(`/job-offers/slug/${slug}`);
    return extractData<JobOffer>(response.data);
  },

  async update(
    id: string,
    data: Partial<JobOfferFormPayload>,
  ): Promise<JobOffer> {
    const response = await api.patch(`/job-offers/${id}`, data);
    return extractData<JobOffer>(response.data);
  },

  async remove(id: string): Promise<{ id: string }> {
    const response = await api.delete(`/job-offers/${id}`);
    return extractData<{ id: string }>(response.data);
  },

  async publish(id: string): Promise<JobOffer> {
    const response = await api.patch(`/job-offers/${id}/publish`);
    return extractData<JobOffer>(response.data);
  },

  async close(id: string): Promise<JobOffer> {
    const response = await api.patch(`/job-offers/${id}/close`);
    return extractData<JobOffer>(response.data);
  },

  async analytics(id: string): Promise<JobOfferAnalytics> {
    const response = await api.get(`/job-offers/analytics/${id}`);
    return extractData<JobOfferAnalytics>(response.data);
  },
};
