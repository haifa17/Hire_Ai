import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  JobEmploymentType,
  JobExperienceLevel,
  JobOfferStatus,
  JobWorkplaceType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryJobOffersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by title, description, city, country',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: JobOfferStatus })
  @IsOptional()
  @IsEnum(JobOfferStatus)
  status?: JobOfferStatus;

  @ApiPropertyOptional({ enum: JobEmploymentType })
  @IsOptional()
  @IsEnum(JobEmploymentType)
  employmentType?: JobEmploymentType;

  @ApiPropertyOptional({ enum: JobWorkplaceType })
  @IsOptional()
  @IsEnum(JobWorkplaceType)
  workplaceType?: JobWorkplaceType;

  @ApiPropertyOptional({ enum: JobExperienceLevel })
  @IsOptional()
  @IsEnum(JobExperienceLevel)
  experienceLevel?: JobExperienceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxSalary?: number;

  @ApiPropertyOptional({
    enum: ['createdAt', 'views', 'salaryMin'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'views', 'salaryMin'])
  sortBy?: 'createdAt' | 'views' | 'salaryMin' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  urgent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  featured?: boolean;
}
