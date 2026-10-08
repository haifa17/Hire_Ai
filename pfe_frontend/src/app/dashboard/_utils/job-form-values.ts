import type { JobOffer } from "@/domain/models/JobOffer";
import type {
  JobOfferFormValues,
  JobEmploymentTypes,
  JobWorkplaceTypes,
  JobExperienceLevels,
} from "@/features/jobs/schemas/jobOfferSchema";

type JobEmploymentType = (typeof JobEmploymentTypes)[number];
type JobWorkplaceType = (typeof JobWorkplaceTypes)[number];
type JobExperienceLevel = (typeof JobExperienceLevels)[number];

function toOptionalNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return Number(value);
}

/** "2026-10-05T…" -> "2026-10-05", the value a date input expects. */
function toDateInputValue(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

/** Maps a saved job offer to the initial values of the job form. */
export function toJobFormValues(job: JobOffer): Partial<JobOfferFormValues> {
  return {
    title: job.title ?? "",
    department: job.department ?? "",
    employmentType: (job.employmentType as JobEmploymentType) ?? "FULL_TIME",
    workplaceType: (job.workplaceType as JobWorkplaceType) ?? "REMOTE",
    location: job.location ?? "",
    country: job.country ?? "",
    city: job.city ?? "",
    salaryMin: toOptionalNumber(job.salaryMin),
    salaryMax: toOptionalNumber(job.salaryMax),
    currency: job.currency ?? "USD",
    experienceLevel: (job.experienceLevel as JobExperienceLevel) ?? "MID",
    educationLevel: job.educationLevel ?? "",
    description: job.description ?? "",
    responsibilities: job.responsibilities ?? [],
    requirements: job.requirements ?? [],
    preferredSkills: job.preferredSkills ?? [],
    requiredSkills: job.requiredSkills ?? [],
    benefits: job.benefits ?? [],
    languages: job.languages ?? [],
    openings: job.openings ?? 1,
    deadline: toDateInputValue(job.deadline),
    startDate: toDateInputValue(job.startDate),
    featured: !!job.featured,
    urgent: !!job.urgent,
  };
}
