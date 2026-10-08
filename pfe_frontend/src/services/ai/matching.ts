import type { JobOffer } from "@/domain/models/JobOffer";
import type { ResumeData } from "@/services/resumeService";

type ResumeRecord = Record<string, unknown>;

export type MatchingPreviewRequest = {
  candidate: {
    id: string;
    identity: {
      name: string;
      location: string;
      email: string;
      phone: string;
    };
    summary: string;
    experiences: Array<{
      title: string;
      company: string;
      startDate: string;
      endDate: string;
      description: string;
      skillsUsed: string[];
    }>;
    education: Array<{
      degree: string;
      institution: string;
      year: string;
    }>;
    skillsRaw: string[];
    languages: Array<{
      language: string;
      level: string;
    }>;
    certifications: string[];
    totalExperienceYears: number;
    location: string;
    rawText: string;
  };
  jobOffer: {
    id: string;
    title: string;
    company: string;
    missions: string[];
    requiredSkillsRaw: string[];
    niceToHaveSkillsRaw: string[];
    requiredExperienceYears: number;
    contractType: string;
    location: string;
    salaryRange: {
      min: number | null;
      max: number | null;
      currency: string;
    };
    educationLevel: string;
    languages: string[];
    rawText: string;
  };
  language: string;
};

export function buildMatchingPreviewRequest(
  job: JobOffer,
  resume: ResumeData,
  language = "en",
): MatchingPreviewRequest {
  const rawResume = parseResumeRecord(resume.content);
  const header = asRecord(rawResume.header);
  const personalInfo = asRecord(rawResume.personalInfo);
  const candidateName = firstString([
    resume.title,
    header.fullName,
    header.name,
    personalInfo.name,
    personalInfo.fullName,
  ]);
  const candidateLocation = firstString([
    header.address,
    header.location,
    personalInfo.location,
    personalInfo.address,
  ]);
  const candidateEmail = firstString([
    header.email,
    personalInfo.email,
    personalInfo.workEmail,
  ]);
  const candidatePhone = firstString([
    header.phone,
    personalInfo.phone,
    personalInfo.mobile,
  ]);
  const summary = firstString([
    rawResume.summary,
    rawResume.professionalSummary,
    rawResume.about,
    rawResume.objective,
    resume.jobDescription,
  ]);

  const experiences = toExperienceArray(
    firstArrayOrObject(rawResume, [
      "experiences",
      "experience",
      "work",
      "history",
      "professionalExperience",
    ]),
  );
  const education = toEducationArray(
    firstArrayOrObject(rawResume, ["education", "studies", "academic"]),
  );
  const skillsRaw = toSkillArray(
    firstArrayOrObject(rawResume, ["skills", "competencies", "technologies"]),
  );
  const languages = toLanguageArray(
    firstArrayOrObject(rawResume, ["languages", "languageSkills"]),
  );
  const certifications = toStringArray(
    firstArrayOrObject(rawResume, ["certifications", "certificates", "awards"]),
  );

  return {
    candidate: {
      id: resume.id,
      identity: {
        name: candidateName || resume.title || "Candidate",
        location: candidateLocation,
        email: candidateEmail,
        phone: candidatePhone,
      },
      summary,
      experiences,
      education,
      skillsRaw,
      languages,
      certifications,
      totalExperienceYears: calculateExperienceYears(experiences),
      location: candidateLocation,
      rawText: stringifySafe(rawResume) || resume.title,
    },
    jobOffer: {
      id: job.id,
      title: job.title,
      company: job.company?.name ?? "",
      missions: [
        job.description,
        ...job.responsibilities,
        ...job.requirements,
      ].filter((item): item is string => Boolean(item?.trim())),
      requiredSkillsRaw: toStringArray(job.requiredSkills),
      niceToHaveSkillsRaw: toStringArray(job.preferredSkills),
      requiredExperienceYears: mapExperienceLevel(job.experienceLevel),
      contractType: job.workplaceType,
      location: [job.location, job.city, job.country].filter(Boolean).join(", "),
      salaryRange: {
        min: toNumber(job.salaryMin),
        max: toNumber(job.salaryMax),
        currency: job.currency,
      },
      educationLevel: job.educationLevel ?? "",
      languages: toStringArray(job.languages),
      rawText: job.description,
    },
    language,
  };
}

export function extractMatchingScore(payload: unknown): number {
  const analysis = unwrapMatchingPayload(payload);
  if (!analysis) return 0;

  const rawScore =
    analysis.matchScore ??
    analysis.globalScore ??
    analysis.score ??
    analysis.atsScore ??
    analysis.matchPercentage;

  if (typeof rawScore === "number") {
    return clampScore(rawScore);
  }

  if (typeof rawScore === "string") {
    const parsed = Number.parseFloat(rawScore);
    if (Number.isFinite(parsed)) {
      return clampScore(parsed);
    }
  }

  return 0;
}

function unwrapMatchingPayload(payload: unknown): ResumeRecord | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as ResumeRecord;
  const data = asRecord(root.data);
  if (Object.keys(data).length > 0) {
    return asRecord(data.matchingResult) || asRecord(data.content) || data;
  }

  return asRecord(root.matchingResult) || asRecord(root.content) || root;
}

function parseResumeRecord(value: unknown): ResumeRecord {
  if (value && typeof value === "object") {
    return value as ResumeRecord;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed as ResumeRecord;
      }
    } catch {
      return { rawText: value };
    }
  }

  return {};
}

function asRecord(value: unknown): ResumeRecord {
  return value && typeof value === "object" ? (value as ResumeRecord) : {};
}

function firstString(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function stringifySafe(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function firstArrayOrObject(source: ResumeRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value) || (value && typeof value === "object")) {
      return value;
    }
  }
  return [];
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const record = item as ResumeRecord;
        return firstString([
          record.name,
          record.title,
          record.label,
          record.language,
          record.degree,
          record.platform,
        ]);
      }
      return "";
    })
    .filter((item) => item.length > 0);
}

function toSkillArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const record = item as ResumeRecord;
        return firstString([record.name, record.title, record.skill, record.label]);
      }
      return "";
    })
    .filter((item) => item.length > 0);
}

function toLanguageArray(value: unknown): Array<{ language: string; level: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { language: item.trim(), level: "" };
      }

      if (item && typeof item === "object") {
        const record = item as ResumeRecord;
        return {
          language: firstString([record.language, record.name, record.label]),
          level: firstString([record.level, record.proficiency]),
        };
      }

      return { language: "", level: "" };
    })
    .filter((item) => item.language.length > 0);
}

function toEducationArray(value: unknown): Array<{ degree: string; institution: string; year: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (item && typeof item === "object") {
        const record = item as ResumeRecord;
        return {
          degree: firstString([record.degree, record.title]),
          institution: firstString([record.institution, record.school, record.university]),
          year: firstString([record.year, record.endDate, record.date]),
        };
      }

      if (typeof item === "string") {
        return { degree: item.trim(), institution: "", year: "" };
      }

      return { degree: "", institution: "", year: "" };
    })
    .filter((item) => item.degree.length > 0 || item.institution.length > 0);
}

function toExperienceArray(
  value: unknown,
): Array<{ title: string; company: string; startDate: string; endDate: string; description: string; skillsUsed: string[] }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (item && typeof item === "object") {
        const record = item as ResumeRecord;
        return {
          title: firstString([record.title, record.position, record.jobTitle]),
          company: firstString([record.company, record.employer, record.organization]),
          startDate: firstString([record.startDate, record.start]),
          endDate: firstString([record.endDate, record.end, record.present ? "Present" : ""]),
          description: firstString([record.description, record.summary]) || stringifySafe(record),
          skillsUsed: toStringArray(record.skillsUsed ?? record.skills ?? record.technologies),
        };
      }

      if (typeof item === "string") {
        return {
          title: "",
          company: "",
          startDate: "",
          endDate: "",
          description: item.trim(),
          skillsUsed: [],
        };
      }

      return {
        title: "",
        company: "",
        startDate: "",
        endDate: "",
        description: "",
        skillsUsed: [],
      };
    })
    .filter((item) => item.title.length > 0 || item.company.length > 0 || item.description.length > 0);
}

function calculateExperienceYears(
  experiences: Array<{ startDate: string; endDate: string }>,
): number {
  if (experiences.length === 0) return 0;

  let totalMonths = 0;
  for (const experience of experiences) {
    const start = parseDate(experience.startDate);
    const end = parseDate(experience.endDate) ?? new Date();
    if (!start) continue;

    const diffMonths = Math.max(
      0,
      (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()),
    );
    totalMonths += diffMonths;
  }

  return Number((totalMonths / 12).toFixed(1));
}

function parseDate(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapExperienceLevel(level: JobOffer["experienceLevel"]): number {
  switch (level) {
    case "ENTRY":
      return 0.5;
    case "JUNIOR":
      return 1;
    case "MID":
      return 3;
    case "SENIOR":
      return 5;
    case "LEAD":
      return 7;
    case "EXECUTIVE":
      return 10;
    default:
      return 3;
  }
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}