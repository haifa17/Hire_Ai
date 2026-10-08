import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  JobEducationLevel,
  JobEmploymentType,
  JobExperienceLevel,
  JobWorkplaceType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateJobOfferDto {
  @ApiProperty({ example: 'Senior React Developer' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty({ enum: JobEmploymentType })
  @IsEnum(JobEmploymentType)
  employmentType: JobEmploymentType;

  @ApiProperty({ enum: JobWorkplaceType })
  @IsEnum(JobWorkplaceType)
  workplaceType: JobWorkplaceType;

  @ApiProperty({ example: 'Paris, France (Hybrid)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  location: string;

  @ApiProperty({ example: 'France' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  country: string;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ example: 75000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salaryMax?: number;

  @ApiPropertyOptional({ example: 'EUR', default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ enum: JobExperienceLevel })
  @IsEnum(JobExperienceLevel)
  experienceLevel: JobExperienceLevel;

  @ApiPropertyOptional({ enum: JobEducationLevel })
  @IsOptional()
  @IsEnum(JobEducationLevel)
  educationLevel?: JobEducationLevel;

  @ApiProperty({ example: 'We are looking for a product-minded engineer...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  description: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  responsibilities: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  requirements: string[];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  openings?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: '2026-09-01T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean;
}
