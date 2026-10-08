import { create } from 'zustand';
import { Job } from '@/domain/models/Job';

interface JobState {
  savedJobs: Job[];
  appliedJobs: Job[];
  saveJob: (job: Job) => void;
  applyForJob: (job: Job) => void;
  removeSavedJob: (jobId: string) => void;
}

export const useJobStore = create<JobState>((set) => ({
  savedJobs: [],
  appliedJobs: [],
  saveJob: (job) => set((state) => ({ savedJobs: [...state.savedJobs, job] })),
  applyForJob: (job) => set((state) => ({ appliedJobs: [...state.appliedJobs, job] })),
  removeSavedJob: (jobId) =>
    set((state) => ({ savedJobs: state.savedJobs.filter((j) => j.id !== jobId) })),
}));
