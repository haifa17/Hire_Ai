import { AxiosError } from "axios";
import api from "@/lib/api";
import type {
  CandidateProfile,
  Certification,
  Education,
  Experience,
  Language,
  Project,
  Skill,
} from "@/domain/models/Profile";

export type ApiRole = "CANDIDATE" | "RECRUITER" | "ADMIN";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function toValidHttpUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function normalizeApiBaseUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  return toValidHttpUrl(withProtocol);
}

interface ApiEnvelope<T> {
  data: T;
  message: string;
  statusCode: number;
  success: boolean;
  path: string;
  timestamp: string;
}

interface CandidateProfileResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: ApiRole;
    photoUrl?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  profile: {
    id: string;
    userId: string;
    professionalSummary?: string | null;
    openToWork?: boolean;
    desiredSalary?: number | null;
    desiredPosition?: string | null;
    socialLinks?: unknown;
    experiences?: unknown;
    education?: unknown;
    skills?: unknown;
    languages?: unknown;
    projects?: unknown;
    certifications?: unknown;
  };
}

export interface RecruiterProfileResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: ApiRole;
    photoUrl?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  profile: {
    id: string;
    userId: string;
    companyId: string;
    position?: string | null;
    department?: string | null;
    company?: {
      id: string;
      name: string;
      logoUrl?: string | null;
      address?: string | null;
      phone?: string | null;
      industry?: string | null;
      companySize?: string | null;
      description?: string | null;
    };
  };
}

interface CurrentUserProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: ApiRole;
  photoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface UpdateCurrentUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
}

interface RecruiterCompanyPayload {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  description?: string;
}

interface RecruiterCreatePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phone?: string;
  address?: string;
  position: string;
  department: string;
  company?: RecruiterCompanyPayload;
  companyId?: string;
}

interface RecruiterUpdatePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phone?: string;
  address?: string;
  position?: string;
  department?: string;
  company?: RecruiterCompanyPayload;
  companyId?: string;
}

interface CandidatePhotoUploadData {
  user: {
    photoUrl?: string | null;
  };
}

interface RecruiterCompanyLogoUploadData {
  company: {
    logoUrl?: string | null;
  };
}

interface CurrentUserPhotoUploadData {
  user: {
    photoUrl?: string | null;
  };
}

interface CandidateCreatePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phone?: string;
  address?: string;
  professionalSummary?: string;
  openToWork?: boolean;
  desiredSalary?: number | null;
  desiredPosition?: string;
  socialLinks?: Array<{
    platform: string;
    link: string;
  }>;
  experiences?: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
  }>;
  skills?: Array<{
    name: string;
    level: number;
  }>;
  languages?: Array<{
    language: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "NATIVE";
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    issueDate?: string;
    credentialUrl?: string;
  }>;
  projects?: Array<{
    title: string;
    description?: string;
    url?: string;
  }>;
}

function buildCandidateSocialLinks(
  personalInfo: CandidateProfile["personalInfo"],
) {
  const links = [
    { platform: "LinkedIn", link: personalInfo.linkedinUrl.trim() },
    { platform: "GitHub", link: personalInfo.githubUrl.trim() },
    { platform: "Portfolio", link: personalInfo.portfolioUrl.trim() },
  ].filter((item) => item.link.length > 0);

  return links.length > 0 ? links : undefined;
}

function mapSkillLevel(level: Skill["level"]): number {
  if (level === "Beginner") return 1;
  if (level === "Intermediate") return 2;
  if (level === "Advanced") return 3;
  return 4;
}

function mapLanguageLevel(
  proficiency: Language["proficiency"],
): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "NATIVE" {
  if (proficiency === "Basic") return "BEGINNER";
  if (proficiency === "Intermediate") return "INTERMEDIATE";
  if (proficiency === "Advanced") return "ADVANCED";
  return "NATIVE";
}

function sanitizeExperiences(experiences: Experience[]) {
  return experiences
    .filter((exp) => exp.companyName && exp.jobTitle && exp.startDate)
    .map((exp) => ({
      company: exp.companyName,
      position: exp.jobTitle,
      startDate: exp.startDate,
      endDate: exp.isCurrent ? undefined : (exp.endDate ?? undefined),
      description: exp.description || undefined,
      city: exp.city || undefined,
      country: exp.country || undefined,
    }));
}

function sanitizeEducation(educations: Education[]) {
  return educations
    .filter(
      (edu) =>
        edu.institution.trim() &&
        edu.degree.trim() &&
        edu.fieldOfStudy.trim() &&
        edu.startYear.trim(),
    )
    .map((edu) => {
      const endDate =
        edu.isCurrent || !edu.endYear ? undefined : `${edu.endYear}-01-01`;

      return {
        school: edu.institution.trim(),
        degree: edu.degree.trim(),
        field: edu.fieldOfStudy.trim(),
        // backend expects date strings
        startDate: `${edu.startYear.trim()}-01-01`,
        endDate,
        city: edu.city || undefined,
        country: edu.country || undefined,
      };
    });
}

function sanitizeSkills(skills: Skill[]) {
  return skills
    .filter((skill) => skill.name)
    .map((skill) => ({
      name: skill.name,
      level: mapSkillLevel(skill.level),
    }));
}

function sanitizeLanguages(languages: Language[]) {
  return languages
    .filter((lang) => lang.name)
    .map((lang) => ({
      language: lang.name,
      level: mapLanguageLevel(lang.proficiency),
    }));
}

function sanitizeCertifications(certifications: Certification[]) {
  return certifications
    .filter((cert) => cert.name)
    .map((cert) => ({
      name: cert.name,
      issuer: cert.issuingOrganization || undefined,
      issueDate: cert.issueDate || undefined,
      credentialUrl: cert.credentialUrl || undefined,
      fileUrl: cert.fileUrl || undefined,
    }));
}

function sanitizeProjects(projects: Project[]) {
  return projects
    .filter((project) => project.title)
    .map((project) => ({
      title: project.title,
      description: project.description || undefined,
      url: project.url || undefined,
    }));
}

function toMonth(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.length >= 7 ? value.slice(0, 7) : null;
  }
  return date.toISOString().slice(0, 7);
}

function toYear(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const parsed = Number.parseInt(value.slice(0, 4), 10);
    return Number.isNaN(parsed) ? null : String(parsed);
  }
  return String(date.getUTCFullYear());
}

function mapSkillLevelFromNumber(level: unknown): Skill["level"] {
  if (level === 1) return "Beginner";
  if (level === 2) return "Intermediate";
  if (level === 3) return "Advanced";
  return "Expert";
}

function mapLanguageLevelFromApi(level: unknown): Language["proficiency"] {
  if (level === "BEGINNER") return "Basic";
  if (level === "INTERMEDIATE") return "Intermediate";
  if (level === "ADVANCED") return "Advanced";
  if (level === "NATIVE") return "Native";
  if (level === "FLUENT") return "Fluent";
  return "Fluent";
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null,
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function mapCandidateApiToBuilder(
  source: CandidateProfileResponse,
): CandidateProfile {
  const socialLinks = asRecordArray(source.profile.socialLinks);
  const linkedinLink =
    socialLinks.find(
      (item) => asString(item.platform).toLowerCase() === "linkedin",
    )?.link ?? "";
  const githubLink =
    socialLinks.find(
      (item) => asString(item.platform).toLowerCase() === "github",
    )?.link ?? "";
  const portfolioLink =
    socialLinks.find((item) =>
      ["portfolio", "website", "site"].includes(
        asString(item.platform).toLowerCase(),
      ),
    )?.link ?? "";

  const experiences = asRecordArray(source.profile.experiences).map(
    (exp, index) => ({
      id: `exp-${index}`,
      jobTitle: asString(exp.position),
      companyName: asString(exp.company),
      location: asString(exp.location) || "",
      city: asString(exp.city) || undefined,
      country: asString(exp.country) || undefined,
      startDate: toMonth(asString(exp.startDate)) ?? "",
      endDate: toMonth(asNullableString(exp.endDate)),
      isCurrent: !asNullableString(exp.endDate),
      description: asString(exp.description),
    }),
  );

  const educations = asRecordArray(source.profile.education).map(
    (edu, index) => ({
      id: `edu-${index}`,
      institution: asString(edu.school),
      degree: asString(edu.degree),
      fieldOfStudy: asString(edu.field),
      startYear: toYear(asString(edu.startDate)) ?? "",
      endYear: toYear(asNullableString(edu.endDate)),
      isCurrent: !asNullableString(edu.endDate),
      description: asString(edu.description) || "",
      city: asString(edu.city) || undefined,
      country: asString(edu.country) || undefined,
    }),
  );

  const skills = asRecordArray(source.profile.skills).map((skill, index) => ({
    id: `skill-${index}`,
    name: asString(skill.name),
    level: mapSkillLevelFromNumber(skill.level),
  }));

  const languages = asRecordArray(source.profile.languages).map(
    (language, index) => ({
      id: `lang-${index}`,
      name: asString(language.language),
      proficiency: mapLanguageLevelFromApi(language.level),
    }),
  );

  const certifications = asRecordArray(source.profile.certifications).map(
    (certification, index) => ({
      id: `cert-${index}`,
      name: asString(certification.name),
      issuingOrganization: asString(certification.issuer),
      issueDate: toMonth(asString(certification.issueDate)) ?? "",
      expiryDate: null,
      credentialId: "",
      credentialUrl: asString(certification.credentialUrl),
      fileUrl: toAbsoluteAssetUrl(asString(certification.fileUrl)) ?? undefined,
    }),
  );

  const projects = asRecordArray(source.profile.projects).map(
    (project, index) => ({
      id: `proj-${index}`,
      title: asString(project.title),
      description: asString(project.description),
      url: asString(project.url),
    }),
  );

  return {
    personalInfo: {
      firstName: source.user.firstName ?? "",
      lastName: source.user.lastName ?? "",
      email: source.user.email ?? "",
      phone: source.user.phone ?? "",
      location: source.user.address ?? "",
      summary: source.profile.professionalSummary ?? "",
      openToWork: source.profile.openToWork ?? true,
      desiredSalary:
        source.profile.desiredSalary == null
          ? ""
          : String(source.profile.desiredSalary),
      desiredPosition: source.profile.desiredPosition ?? "",
      linkedinUrl: asString(linkedinLink),
      githubUrl: asString(githubLink),
      portfolioUrl: asString(portfolioLink),
      photoUrl: toAbsoluteAssetUrl(source.user.photoUrl) ?? null,
    },
    experiences,
    educations,
    skills,
    languages,
    projects,
    certifications,
  };
}

export function toAbsoluteAssetUrl(value?: string | null): string | undefined {
  if (!value) return undefined;

  const asHttpUrl = toValidHttpUrl(value);
  if (asHttpUrl) return asHttpUrl;

  if (value.startsWith("/uploads/")) {
    const normalizedBase = normalizeApiBaseUrl(API_BASE_URL);
    if (!normalizedBase) return undefined;

    return toValidHttpUrl(new URL(value, normalizedBase).toString());
  }

  return undefined;
}

function mapRecruiterProfileResponse(
  source: RecruiterProfileResponse,
): RecruiterProfileResponse {
  return {
    ...source,
    user: {
      ...source.user,
      photoUrl: toAbsoluteAssetUrl(source.user.photoUrl) ?? null,
    },
    profile: {
      ...source.profile,
      company: source.profile.company
        ? {
            ...source.profile.company,
            logoUrl: toAbsoluteAssetUrl(source.profile.company.logoUrl) ?? null,
          }
        : source.profile.company,
    },
  };
}

export const profileService = {
  async getCurrentUserProfile(): Promise<CurrentUserProfileResponse> {
    const res =
      await api.get<ApiEnvelope<CurrentUserProfileResponse>>("/users/me");
    return {
      ...res.data.data,
      photoUrl: toAbsoluteAssetUrl(res.data.data.photoUrl),
    };
  },

  async updateCurrentUserProfile(
    payload: UpdateCurrentUserPayload,
  ): Promise<CurrentUserProfileResponse> {
    const res = await api.patch<ApiEnvelope<CurrentUserProfileResponse>>(
      "/users/me",
      payload,
    );

    return {
      ...res.data.data,
      photoUrl: toAbsoluteAssetUrl(res.data.data.photoUrl),
    };
  },

  async getMyCandidateProfile(): Promise<CandidateProfileResponse> {
    const res = await api.get<ApiEnvelope<CandidateProfileResponse>>(
      "/profiles/candidate/me",
    );
    return res.data.data;
  },

  async getMyRecruiterProfile(): Promise<RecruiterProfileResponse> {
    const res = await api.get<ApiEnvelope<RecruiterProfileResponse>>(
      "/profiles/recruiter/me",
    );
    return mapRecruiterProfileResponse(res.data.data);
  },

  async hasCurrentUserProfile(role: ApiRole): Promise<boolean> {
    if (role === "ADMIN") return true;

    try {
      if (role === "CANDIDATE") {
        await this.getMyCandidateProfile();
      } else {
        await this.getMyRecruiterProfile();
      }
      return true;
    } catch (error) {
      const axiosError = error as AxiosError<{ statusCode?: number }>;
      if (axiosError.response?.status === 404) return false;
      throw error;
    }
  },

  async createCandidateProfileFromBuilder(profile: CandidateProfile) {
    const parsedDesiredSalary = Number.parseFloat(
      profile.personalInfo.desiredSalary,
    );

    const payload: CandidateCreatePayload = {
      email: profile.personalInfo.email || undefined,
      firstName: profile.personalInfo.firstName || undefined,
      lastName: profile.personalInfo.lastName || undefined,
      phone: profile.personalInfo.phone || undefined,
      address: profile.personalInfo.location || undefined,
      professionalSummary: profile.personalInfo.summary || undefined,
      openToWork: profile.personalInfo.openToWork,
      desiredSalary: Number.isNaN(parsedDesiredSalary)
        ? null
        : parsedDesiredSalary,
      desiredPosition: profile.personalInfo.desiredPosition || undefined,
      socialLinks: buildCandidateSocialLinks(profile.personalInfo),
      experiences: sanitizeExperiences(profile.experiences),
      education: sanitizeEducation(profile.educations),
      skills: sanitizeSkills(profile.skills),
      languages: sanitizeLanguages(profile.languages),
      projects: sanitizeProjects(profile.projects),
      certifications: sanitizeCertifications(profile.certifications),
    };

    const res = await api.post<ApiEnvelope<CandidateProfileResponse>>(
      "/profiles/candidate",
      payload,
    );

    return res.data.data;
  },

  async updateCandidateProfileFromBuilder(profile: CandidateProfile) {
    const parsedDesiredSalary = Number.parseFloat(
      profile.personalInfo.desiredSalary,
    );

    const payload: CandidateCreatePayload = {
      email: profile.personalInfo.email || undefined,
      firstName: profile.personalInfo.firstName || undefined,
      lastName: profile.personalInfo.lastName || undefined,
      phone: profile.personalInfo.phone || undefined,
      address: profile.personalInfo.location || undefined,
      professionalSummary: profile.personalInfo.summary || undefined,
      openToWork: profile.personalInfo.openToWork,
      desiredSalary: Number.isNaN(parsedDesiredSalary)
        ? null
        : parsedDesiredSalary,
      desiredPosition: profile.personalInfo.desiredPosition || undefined,
      socialLinks: buildCandidateSocialLinks(profile.personalInfo),
      experiences: sanitizeExperiences(profile.experiences),
      education: sanitizeEducation(profile.educations),
      skills: sanitizeSkills(profile.skills),
      languages: sanitizeLanguages(profile.languages),
      projects: sanitizeProjects(profile.projects),
      certifications: sanitizeCertifications(profile.certifications),
    };

    const res = await api.patch<ApiEnvelope<CandidateProfileResponse>>(
      "/profiles/candidate",
      payload,
    );

    return res.data.data;
  },

  async getCandidateProfileForBuilder(): Promise<CandidateProfile> {
    const data = await this.getMyCandidateProfile();
    return mapCandidateApiToBuilder(data);
  },

  async createRecruiterProfile(payload: RecruiterCreatePayload) {
    const res = await api.post<ApiEnvelope<RecruiterProfileResponse>>(
      "/profiles/recruiter",
      payload,
    );
    return mapRecruiterProfileResponse(res.data.data);
  },

  async updateRecruiterProfile(payload: RecruiterUpdatePayload) {
    const res = await api.patch<ApiEnvelope<RecruiterProfileResponse>>(
      "/profiles/recruiter",
      payload,
    );
    return mapRecruiterProfileResponse(res.data.data);
  },

  async uploadCandidatePhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("photo", file);

    const res = await api.patch<ApiEnvelope<CandidatePhotoUploadData>>(
      "/profiles/candidate/photo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const photoUrl = toAbsoluteAssetUrl(res.data.data.user.photoUrl);
    if (!photoUrl) {
      throw new Error("Photo upload succeeded but no photo URL was returned");
    }

    return photoUrl;
  },

  async uploadRecruiterCompanyLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("companyLogo", file);

    const res = await api.patch<ApiEnvelope<RecruiterCompanyLogoUploadData>>(
      "/profiles/recruiter/company-logo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const logoUrl = toAbsoluteAssetUrl(res.data.data.company.logoUrl);
    if (!logoUrl) {
      throw new Error("Logo upload succeeded but no logo URL was returned");
    }

    return logoUrl;
  },

  async uploadCurrentUserPhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("photo", file);

    const res = await api.patch<ApiEnvelope<CurrentUserPhotoUploadData>>(
      "/users/me/photo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const photoUrl = toAbsoluteAssetUrl(res.data.data.user.photoUrl);
    if (!photoUrl) {
      throw new Error("Photo upload succeeded but no photo URL was returned");
    }

    return photoUrl;
  },
};
