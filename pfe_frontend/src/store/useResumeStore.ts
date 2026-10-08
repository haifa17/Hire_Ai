import { create } from "zustand";
import { AxiosError } from "axios";
import {
  resumeService,
  ResumeData,
  CreateResumeDto,
  UpdateResumeDto,
  OptimizeResumePayload,
  OptimizeResumeResult,
} from "../services/resumeService";
import { ATSScore } from "../domain/models/ATSScore";

interface ResumeState {
  resumes: ResumeData[];
  currentResume: ResumeData | null;
  atsScore: ATSScore | null;
  loading: boolean;
  generating: boolean;
  enhancingResume: boolean;
  scoringResume: boolean;
  optimizingResume: boolean;
  error: string | null;

  fetchResumes: () => Promise<void>;
  fetchResume: (id: string) => Promise<void>;
  createResume: (data: CreateResumeDto) => Promise<ResumeData>;
  enhanceResume: (formData: FormData) => Promise<ResumeData>;
  updateResume: (id: string, data: UpdateResumeDto) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  scoreResume: (id: string) => Promise<ATSScore | null>;
  optimizeResume: (
    id: string,
    payload: OptimizeResumePayload
  ) => Promise<OptimizeResumeResult>;
  clearCurrentResume: () => void;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = error as AxiosError<{
    message?: string | string[];
    error?: { message?: string };
  }>;

  const apiMessage = axiosError.response?.data?.message;
  if (Array.isArray(apiMessage)) {
    return apiMessage.join(", ");
  }

  return (
    apiMessage ||
    axiosError.response?.data?.error?.message ||
    (error instanceof Error ? error.message : undefined) ||
    fallback
  );
};

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  currentResume: null,
  atsScore: null,
  loading: false,
  generating: false,
  enhancingResume: false,
  scoringResume: false,
  optimizingResume: false,
  error: null,

  fetchResumes: async () => {
    set({ loading: true, error: null });
    try {
      const data = await resumeService.getResumes();
      set({ resumes: Array.isArray(data) ? data : [], loading: false });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to fetch resumes"),
        loading: false,
      });
    }
  },

  fetchResume: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await resumeService.getResume(id);
      set({
        currentResume: data,
        atsScore: data?.atsScore ?? null,
        loading: false,
      });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to fetch resume"),
        loading: false,
      });
    }
  },

  createResume: async (data: CreateResumeDto) => {
    set({ generating: true, error: null });
    try {
      const newResume = await resumeService.createResume(data);
      set({
        resumes: [newResume, ...get().resumes],
        atsScore: newResume?.atsScore ?? null,
        generating: false,
      });
      return newResume;
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to generate resume"),
        generating: false,
      });
      throw error;
    }
  },

  enhanceResume: async (formData: FormData) => {
    set({ enhancingResume: true, error: null });
    try {
      const newResume = await resumeService.enhanceResume(formData);
      set({
        resumes: [newResume, ...get().resumes],
        atsScore: newResume?.atsScore ?? null,
        enhancingResume: false,
      });
      return newResume;
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to enhance resume"),
        enhancingResume: false,
      });
      throw error;
    }
  },

  updateResume: async (id: string, data: UpdateResumeDto) => {
    set({ loading: true, error: null });
    try {
      const updated = await resumeService.updateResume(id, data);
      const updatedScore =
        (updated as ResumeData).atsScore ??
        get().currentResume?.atsScore ??
        get().atsScore;
      set({
        resumes: get().resumes.map((r) =>
          r.id === id ? { ...r, ...updated } : r,
        ),
        currentResume:
          get().currentResume?.id === id
            ? { ...get().currentResume, ...updated }
            : get().currentResume,
        atsScore: updatedScore,
        loading: false,
      });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to update resume"),
        loading: false,
      });
      throw error;
    }
  },

  deleteResume: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await resumeService.deleteResume(id);
      set({
        resumes: get().resumes.filter((r) => r.id !== id),
        currentResume:
          get().currentResume?.id === id ? null : get().currentResume,
        atsScore: get().currentResume?.id === id ? null : get().atsScore,
        loading: false,
      });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to delete resume"),
        loading: false,
      });
      throw error;
    }
  },

  scoreResume: async (id: string) => {
    set({ scoringResume: true, error: null });
    try {
      const score = await resumeService.scoreResume(id);
      const currentResume = get().currentResume;
      set({
        atsScore: score,
        currentResume:
          currentResume?.id === id
            ? { ...currentResume, atsScore: score }
            : currentResume,
        resumes: get().resumes.map((resume) =>
          resume.id === id ? { ...resume, atsScore: score } : resume,
        ),
        scoringResume: false,
      });
      return score;
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to score resume"),
        scoringResume: false,
      });
      throw error;
    }
  },

  optimizeResume: async (id: string, payload) => {
    set({ optimizingResume: true, error: null });
    try {
      const result = await resumeService.optimizeResume(id, payload);
      set({ optimizingResume: false });
      return result;
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to optimize resume"),
        optimizingResume: false,
      });
      throw error;
    }
  },

  clearCurrentResume: () => set({ currentResume: null, atsScore: null }),
}));
