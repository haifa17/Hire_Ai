import type { ComponentType } from "react";
import type { CandidateProfile } from "@/domain/models/Profile";
import { CertificationsStep } from "@/features/profile/components/steps/CertificationsStep";
import { EducationStep } from "@/features/profile/components/steps/EducationStep";
import { ExperienceStep } from "@/features/profile/components/steps/ExperienceStep";
import { LanguagesStep } from "@/features/profile/components/steps/LanguagesStep";
import { PersonalInfoStep } from "@/features/profile/components/steps/PersonalInfoStep";
import { ProjectsStep } from "@/features/profile/components/steps/ProjectsStep";
import { SkillsStep } from "@/features/profile/components/steps/SkillsStep";

type CandidateStep = {
  Component: ComponentType;
  /** Whether the user may move past this step. */
  isComplete: (profile: CandidateProfile) => boolean;
  /**
   * Key under `profileBuilder.main.blocked` explaining what is still needed
   * when the step is incomplete. Optional steps have none.
   */
  blockedKey?: BlockedKey;
};

type BlockedKey = "personalInfo" | "experience" | "education" | "skills" | "languages";

const isFilled = (value?: string | null) => Boolean(value?.trim());
const isOptional = () => true;

/**
 * Wizard steps in display order; a step's number is its index + 1. The order
 * must match the sidebar (`ProfileSidebar`) and the `proTips` messages.
 */
export const CANDIDATE_STEPS: CandidateStep[] = [
  {
    Component: PersonalInfoStep,
    blockedKey: "personalInfo",
    isComplete: ({ personalInfo }) =>
      isFilled(personalInfo.firstName) &&
      isFilled(personalInfo.lastName) &&
      isFilled(personalInfo.email) &&
      isFilled(personalInfo.phone) &&
      isFilled(personalInfo.location) &&
      isFilled(personalInfo.summary) &&
      isFilled(personalInfo.desiredPosition),
  },
  {
    Component: ExperienceStep,
    blockedKey: "experience",
    isComplete: (profile) => profile.experiences.length > 0,
  },
  {
    Component: EducationStep,
    blockedKey: "education",
    isComplete: (profile) => profile.educations.length > 0,
  },
  {
    Component: SkillsStep,
    blockedKey: "skills",
    isComplete: (profile) => profile.skills.length > 0,
  },
  {
    Component: LanguagesStep,
    blockedKey: "languages",
    isComplete: (profile) => profile.languages.length > 0,
  },
  { Component: ProjectsStep, isComplete: isOptional },
  { Component: CertificationsStep, isComplete: isOptional },
];
