import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  CandidateProfile,
  PersonalInfo,
  Experience,
  Education,
  Skill,
  Language,
  Project,
  Certification,
} from "@/domain/models/Profile";

const TOTAL_STEPS = 7;

const initialPersonalInfo: PersonalInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  openToWork: true,
  desiredSalary: "",
  desiredPosition: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  photoUrl: null,
};

const initialProfile: CandidateProfile = {
  personalInfo: initialPersonalInfo,
  experiences: [],
  educations: [],
  skills: [],
  languages: [],
  projects: [],
  certifications: [],
};

interface ProfileState {
  profile: CandidateProfile;
  currentStep: number;

  // Navigation
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Personal Info
  updatePersonalInfo: (data: Partial<PersonalInfo>) => void;

  // Experience
  addExperience: (experience: Omit<Experience, "id">) => void;
  updateExperience: (id: string, data: Partial<Experience>) => void;
  removeExperience: (id: string) => void;

  // Education
  addEducation: (education: Omit<Education, "id">) => void;
  updateEducation: (id: string, data: Partial<Education>) => void;
  removeEducation: (id: string) => void;

  // Skills
  addSkill: (skill: Omit<Skill, "id">) => void;
  removeSkill: (id: string) => void;

  // Languages
  addLanguage: (language: Omit<Language, "id">) => void;
  updateLanguage: (id: string, data: Partial<Language>) => void;
  removeLanguage: (id: string) => void;

  // Projects
  addProject: (project: Omit<Project, "id">) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  removeProject: (id: string) => void;

  // Certifications
  addCertification: (cert: Omit<Certification, "id">) => void;
  updateCertification: (id: string, data: Partial<Certification>) => void;
  removeCertification: (id: string) => void;

  // Helpers
  setProfile: (profile: CandidateProfile) => void;
  getCompletionPercentage: () => number;
  resetProfile: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeProfile(
  profile: Partial<CandidateProfile> | undefined,
): CandidateProfile {
  return {
    personalInfo: {
      ...initialPersonalInfo,
      ...profile?.personalInfo,
    },
    experiences: asArray(profile?.experiences),
    educations: asArray(profile?.educations),
    skills: asArray(profile?.skills),
    languages: asArray(profile?.languages),
    projects: asArray(profile?.projects),
    certifications: asArray(profile?.certifications),
  };
}

function getCompletionPercentage(profile: CandidateProfile): number {
  let completed = 0;

  const { personalInfo } = profile;
  if (personalInfo.firstName && personalInfo.lastName && personalInfo.email) {
    completed += 1;
  }
  if (asArray(profile.experiences).length > 0) completed += 1;
  if (asArray(profile.educations).length > 0) completed += 1;
  if (asArray(profile.skills).length > 0) completed += 1;
  if (asArray(profile.languages).length > 0) completed += 1;
  if (asArray(profile.projects).length > 0) completed += 1;
  if (asArray(profile.certifications).length > 0) completed += 1;

  return Math.round((completed / TOTAL_STEPS) * 100);
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: initialProfile,
      currentStep: 1,

      setStep: (step) => set({ currentStep: step }),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS),
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1),
        })),

      updatePersonalInfo: (data) =>
        set((state) => ({
          profile: {
            ...state.profile,
            personalInfo: { ...state.profile.personalInfo, ...data },
          },
        })),

      addExperience: (experience) =>
        set((state) => ({
          profile: {
            ...state.profile,
            experiences: [
              ...state.profile.experiences,
              { ...experience, id: generateId() },
            ],
          },
        })),

      updateExperience: (id, data) =>
        set((state) => ({
          profile: {
            ...state.profile,
            experiences: state.profile.experiences.map((exp) =>
              exp.id === id ? { ...exp, ...data } : exp,
            ),
          },
        })),

      removeExperience: (id) =>
        set((state) => ({
          profile: {
            ...state.profile,
            experiences: state.profile.experiences.filter(
              (exp) => exp.id !== id,
            ),
          },
        })),

      addEducation: (education) =>
        set((state) => ({
          profile: {
            ...state.profile,
            educations: [
              ...state.profile.educations,
              { ...education, id: generateId() },
            ],
          },
        })),

      updateEducation: (id, data) =>
        set((state) => ({
          profile: {
            ...state.profile,
            educations: state.profile.educations.map((edu) =>
              edu.id === id ? { ...edu, ...data } : edu,
            ),
          },
        })),

      removeEducation: (id) =>
        set((state) => ({
          profile: {
            ...state.profile,
            educations: state.profile.educations.filter((edu) => edu.id !== id),
          },
        })),

      addSkill: (skill) =>
        set((state) => ({
          profile: {
            ...state.profile,
            skills: [...state.profile.skills, { ...skill, id: generateId() }],
          },
        })),

      removeSkill: (id) =>
        set((state) => ({
          profile: {
            ...state.profile,
            skills: state.profile.skills.filter((s) => s.id !== id),
          },
        })),

      addLanguage: (language) =>
        set((state) => ({
          profile: {
            ...state.profile,
            languages: [
              ...state.profile.languages,
              { ...language, id: generateId() },
            ],
          },
        })),

      updateLanguage: (id, data) =>
        set((state) => ({
          profile: {
            ...state.profile,
            languages: state.profile.languages.map((lang) =>
              lang.id === id ? { ...lang, ...data } : lang,
            ),
          },
        })),

      removeLanguage: (id) =>
        set((state) => ({
          profile: {
            ...state.profile,
            languages: state.profile.languages.filter((l) => l.id !== id),
          },
        })),

      addProject: (project) =>
        set((state) => ({
          profile: {
            ...state.profile,
            projects: [
              ...state.profile.projects,
              { ...project, id: generateId() },
            ],
          },
        })),

      updateProject: (id, data) =>
        set((state) => ({
          profile: {
            ...state.profile,
            projects: state.profile.projects.map((project) =>
              project.id === id ? { ...project, ...data } : project,
            ),
          },
        })),

      removeProject: (id) =>
        set((state) => ({
          profile: {
            ...state.profile,
            projects: state.profile.projects.filter(
              (project) => project.id !== id,
            ),
          },
        })),

      addCertification: (cert) =>
        set((state) => ({
          profile: {
            ...state.profile,
            certifications: [
              ...state.profile.certifications,
              { ...cert, id: generateId() },
            ],
          },
        })),

      updateCertification: (id, data) =>
        set((state) => ({
          profile: {
            ...state.profile,
            certifications: state.profile.certifications.map((c) =>
              c.id === id ? { ...c, ...data } : c,
            ),
          },
        })),

      removeCertification: (id) =>
        set((state) => ({
          profile: {
            ...state.profile,
            certifications: state.profile.certifications.filter(
              (c) => c.id !== id,
            ),
          },
        })),

      setProfile: (profile) =>
        set({
          profile: normalizeProfile(profile),
          currentStep: 1,
        }),

      getCompletionPercentage: () => getCompletionPercentage(get().profile),

      resetProfile: () => set({ profile: initialProfile, currentStep: 1 }),
    }),
    {
      name: "candidate-profile",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ProfileState>;
        const current = currentState;

        return {
          ...current,
          ...persisted,
          profile: normalizeProfile(persisted.profile),
          currentStep:
            typeof persisted.currentStep === "number"
              ? Math.min(Math.max(persisted.currentStep, 1), TOTAL_STEPS)
              : current.currentStep,
        };
      },
      storage: createJSONStorage(() =>
        globalThis.window
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
    },
  ),
);
