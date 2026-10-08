import { ApiProperty } from '@nestjs/swagger';
import {
  JobEducationLevel,
  JobEmploymentType,
  JobExperienceLevel,
  JobWorkplaceType,
} from '@prisma/client';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AiGenerateJobOfferDto {
  @ApiProperty({
    example: 'Need React developer remote urgently',
    description:
      'Short recruiter prompt used to generate a structured job offer draft',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(400)
  prompt: string;

  @ApiProperty({
    example: 'EN',
    description: 'Language for the generated draft',
    enum: ['EN', 'FR'],
    required: false,
    default: 'EN',
  })
  @IsOptional()
  @IsIn(['EN', 'FR', 'en', 'fr'])
  language?: string;
}

export class AiGeneratedJobOfferResponseDto {
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
