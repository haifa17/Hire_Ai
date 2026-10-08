import api from "../lib/api";
import { ATSScoreResult } from "../domain/models/ATSScore";
import type { ResumeTemplateId } from "@/domain/models/ResumeTemplate";

export interface ResumeData {
  id: string;
  candidateId: string;
  title: string;
  language: string;
  jobDescription: string;
  content: string | Record<string, unknown>;
  atsScore?: ATSScoreResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResumeDto {
  title: string;
  language: string;
  jobDescription?: string;
  jobOfferId?: string;
  template?: ResumeTemplateId;
}

export interface UpdateResumeDto {
  title?: string;
  content?: string | Record<string, unknown>;
}

export interface OptimizeResumePayload {
  resumeContent: unknown;
  missingKeywords?: string[];
  suggestions?: string[];
}

export interface OptimizeResumeResult {
  optimizedContent: unknown;
  addedKeywords: string[];
  modifiedSections: string[];
  summaryOfChanges: string;
}

export const resumeService = {
  createResume: async (data: CreateResumeDto) => {
    const response = await api.post("/resumes/generate", data, {
      // AI generation can be long when using local large-context models.
      timeout: 310000,
    });
    return response.data?.data || response.data;
  },

  getResumes: async () => {
    const response = await api.get("/resumes");
    return response.data?.data || response.data;
  },

  getResume: async (id: string) => {
    const response = await api.get(`/resumes/${id}`);
    return response.data?.data || response.data;
  },

  updateResume: async (id: string, data: UpdateResumeDto) => {
    const response = await api.put(`/resumes/${id}`, data, {
      timeout: 60000,
    });
    return response.data?.data || response.data;
  },

  deleteResume: async (id: string) => {
    const response = await api.delete(`/resumes/${id}`);
    return response.data?.data || response.data;
  },

  scoreResume: async (id: string): Promise<ATSScoreResult> => {
    const response = await api.post(`/resumes/${id}/score`);
    return (
      response.data?.data?.atsScore || response.data?.data || response.data
    );
  },

  optimizeResume: async (
    id: string,
    payload: OptimizeResumePayload
  ): Promise<OptimizeResumeResult> => {
    const response = await api.post(`/resumes/${id}/optimize`, payload, {
      timeout: 300000,
    });
    return response.data?.data || response.data;
  },

  enhanceResume: async (formData: FormData): Promise<ResumeData> => {
    const response = await api.post("/resumes/enhance", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 310000,
    });
    return response.data?.data || response.data;
  },
};

