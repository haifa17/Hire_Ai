import {
  JobEducationLevel,
  JobEmploymentType,
  JobExperienceLevel,
  JobOfferStatus,
  JobWorkplaceType,
} from '@prisma/client';

export class JobOfferEntity {
  id: string;
  companyId: string;
  recruiterId: string;
  title: string;
  slug: string;
  department: string | null;
  employmentType: JobEmploymentType;
  workplaceType: JobWorkplaceType;
  location: string;
  country: string;
  city: string;
  salaryMin: string | null;
  salaryMax: string | null;
  currency: string;
  experienceLevel: JobExperienceLevel;
  educationLevel: JobEducationLevel | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferredSkills: string[];
  requiredSkills: string[];
  benefits: string[];
  languages: string[];
  openings: number;
  deadline: Date | null;
  startDate: Date | null;
  status: JobOfferStatus;
  featured: boolean;
  urgent: boolean;
  views: number;
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;
}
