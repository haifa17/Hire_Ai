import { z } from "zod";

// NOTE: zod validation messages below are intentionally left in English; wiring them through
// next-intl would require refactoring the calling form components (JobForm.tsx) to map error
// codes to translated messages, which is out of scope for this pass.

export const JobEmploymentTypes = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "CDD",
  "CDI",
  "TEMPORARY",
  "INTERNSHIP",
  "FREELANCE",
] as const;

export const JobWorkplaceTypes = ["ONSITE", "HYBRID", "REMOTE"] as const;

export const JobExperienceLevels = [
  "ENTRY",
  "JUNIOR",
  "MID",
  "SENIOR",
  "LEAD",
  "EXECUTIVE",
] as const;

export const JobEducationLevels = [
  "HIGH_SCHOOL",
  "ASSOCIATE",
  "BACHELOR",
  "MASTER",
  "PHD",
  "OTHER",
] as const;

const tagArraySchema = z.array(
  z.string().trim().min(1, "Value cannot be empty"),
);

export const jobOfferSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Job title must be at least 3 characters")
      .max(120, "Job title must be 120 characters or fewer"),
    department: z
      .string()
      .trim()
      .max(100, "Department must be 100 characters or fewer")
      .optional()
      .or(z.literal("")),
    employmentType: z.enum(JobEmploymentTypes),
    workplaceType: z.enum(JobWorkplaceTypes),
    location: z
      .string()
      .trim()
      .min(2, "Location is required")
      .max(160, "Location must be 160 characters or fewer"),
    country: z
      .string()
      .trim()
      .min(2, "Country is required")
      .max(80, "Country must be 80 characters or fewer"),
    city: z
      .string()
      .trim()
      .min(2, "City is required")
      .max(80, "City must be 80 characters or fewer"),
    salaryMin: z.coerce.number().min(0, "Salary cannot be negative").optional(),
    salaryMax: z.coerce.number().min(0, "Salary cannot be negative").optional(),
    currency: z.string().trim().min(3).max(10),
    experienceLevel: z.enum(JobExperienceLevels),
    educationLevel: z.enum(JobEducationLevels).optional().or(z.literal("")),
    description: z
      .string()
      .trim()
      .min(20, "Description must be at least 20 characters"),
    responsibilities: tagArraySchema,
    requirements: tagArraySchema,
    preferredSkills: tagArraySchema,
    requiredSkills: tagArraySchema,
    benefits: tagArraySchema,
    languages: tagArraySchema,
    openings: z.coerce
      .number()
      .int("Openings must be a whole number")
      .min(1, "There must be at least 1 opening"),
    deadline: z.string().optional().or(z.literal("")),
    startDate: z.string().optional().or(z.literal("")),
    featured: z.boolean(),
    urgent: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (
      typeof value.salaryMin === "number" &&
      typeof value.salaryMax === "number" &&
      value.salaryMin > value.salaryMax
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["salaryMax"],
        message:
          "Maximum salary must be greater than or equal to minimum salary",
      });
    }
  });

export type JobOfferFormValues = z.infer<typeof jobOfferSchema>;
