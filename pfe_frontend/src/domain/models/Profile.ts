export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  openToWork: boolean;
  desiredSalary: string;
  desiredPosition: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  photoUrl: string | null;
}

export interface Experience {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  city?: string;
  country?: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string | null;
  city?: string;
  country?: string;
  isCurrent: boolean;
  description: string;
}

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface Skill {
  id: string;
  name: string;
  level: SkillLevel;
}

export type LanguageProficiency =
  | "Native"
  | "Fluent"
  | "Advanced"
  | "Intermediate"
  | "Basic";

export interface Language {
  id: string;
  name: string;
  proficiency: LanguageProficiency;
}

export interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate: string | null;
  credentialId: string;
  credentialUrl: string;
  fileUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  url: string;
}

export interface CandidateProfile {
  personalInfo: PersonalInfo;
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  languages: Language[];
  projects: Project[];
  certifications: Certification[];
}
