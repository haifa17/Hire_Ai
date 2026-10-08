import type { useTranslations } from "next-intl";
import type { JobOffer } from "@/domain/models/JobOffer";

export type DetailT = ReturnType<typeof useTranslations<"publicJobs.detail">>;

const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "CDD",
  "CDI",
  "TEMPORARY",
  "INTERNSHIP",
  "FREELANCE",
];
const WORKPLACE_TYPES = ["ONSITE", "HYBRID", "REMOTE"];
const EXPERIENCE_LEVELS = ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "EXECUTIVE"];

/**
 * Translates an enum value coming from the API. A value the frontend does not
 * know yet is shown as-is rather than as a missing-translation key.
 */
function translateEnum(
  t: DetailT,
  namespace: "employmentType" | "workplaceType" | "experienceLevel",
  knownValues: string[],
  value?: string,
): string {
  if (!value) return t("notSpecified");
  if (!knownValues.includes(value)) return value;
  return t(`${namespace}.${value}` as never);
}

export function formatEmploymentType(t: DetailT, type?: string): string {
  return translateEnum(t, "employmentType", EMPLOYMENT_TYPES, type);
}

export function formatWorkplaceType(t: DetailT, type?: string): string {
  return translateEnum(t, "workplaceType", WORKPLACE_TYPES, type);
}

export function formatExperienceLevel(t: DetailT, level?: string): string {
  return translateEnum(t, "experienceLevel", EXPERIENCE_LEVELS, level);
}

export function formatSalary(t: DetailT, job: JobOffer): string {
  if (job.salaryMin == null || job.salaryMax == null) {
    return t("notSpecified");
  }

  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return t("notSpecified");
  }

  return `${job.currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
}

export function formatLongDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getRecruiterName(job: JobOffer): string {
  return `${job.recruiter?.firstName ?? ""} ${job.recruiter?.lastName ?? ""}`.trim();
}
