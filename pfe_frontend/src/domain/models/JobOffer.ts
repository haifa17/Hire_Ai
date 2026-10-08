export type JobOfferStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type JobEmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "CDD"
  | "CDI"
  | "TEMPORARY"
  | "INTERNSHIP"
  | "FREELANCE";

export type JobWorkplaceType = "ONSITE" | "HYBRID" | "REMOTE";

export type JobExperienceLevel =
  | "ENTRY"
  | "JUNIOR"
  | "MID"
  | "SENIOR"
  | "LEAD"
  | "EXECUTIVE";

export type JobEducationLevel =
  | "HIGH_SCHOOL"
  | "ASSOCIATE"
  | "BACHELOR"
  | "MASTER"
  | "PHD"
  | "OTHER";

export interface JobOffer {
  id: string;
  companyId: string;
  recruiterId: string;
  title: string;
  slug: string;
  department?: string | null;
  employmentType: JobEmploymentType;
  workplaceType: JobWorkplaceType;
  location: string;
  country: string;
  city: string;
  salaryMin?: string | number | null;
  salaryMax?: string | number | null;
  currency: string;
  experienceLevel: JobExperienceLevel;
  educationLevel?: JobEducationLevel | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferredSkills: string[];
  requiredSkills: string[];
  benefits: string[];
  languages: string[];
  openings: number;
  deadline?: string | null;
  startDate?: string | null;
  status: JobOfferStatus;
  featured: boolean;
  urgent: boolean;
  views: number;
  applicationsCount: number;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    industry?: string | null;
    companySize?: string | null;
    description?: string | null;
  };
  recruiter?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export interface JobOfferListResponse {
  items: JobOffer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface JobOfferAnalytics {
  id: string;
  status: JobOfferStatus;
  views: number;
  applicationsCount: number;
  conversionRate: number;
  isUrgent: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiGeneratedJobOffer {
  title: string;
  summary: string;
  department?: string;
  employmentType?: JobEmploymentType;
  workplaceType?: JobWorkplaceType;
  location?: string;
  country?: string;
  city?: string;
  experienceLevel?: JobExperienceLevel;
  educationLevel?: JobEducationLevel | null;
  currency?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  openings?: number;
  responsibilities: string[];
  requirements?: string[];
  requiredSkills: string[];
  preferredSkills?: string[];
  benefits: string[];
  languages?: string[];
  keywords: string[];
  featured?: boolean;
  urgent?: boolean;
}

export interface JobOfferFormPayload {
  title: string;
  department?: string;
  employmentType: JobEmploymentType;
  workplaceType: JobWorkplaceType;
  location: string;
  country: string;
  city: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  experienceLevel: JobExperienceLevel;
  educationLevel?: JobEducationLevel;
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferredSkills?: string[];
  requiredSkills?: string[];
  benefits?: string[];
  languages?: string[];
  openings?: number;
  deadline?: string;
  startDate?: string;
  featured?: boolean;
  urgent?: boolean;
}

export interface JobOfferFilters {
  search?: string;
  status?: JobOfferStatus | "";
  employmentType?: JobEmploymentType | "";
  workplaceType?: JobWorkplaceType | "";
  experienceLevel?: JobExperienceLevel | "";
  country?: string;
  city?: string;
  minSalary?: number;
  maxSalary?: number;
  sortBy?: "createdAt" | "views" | "salaryMin";
  sortOrder?: "asc" | "desc";
  urgent?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
}
