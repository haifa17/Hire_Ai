import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LanguageLevel } from '@prisma/client';

export class SocialLinkDto {
  @ApiPropertyOptional({ example: 'LinkedIn' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/jane-doe' })
  @IsString()
  @IsUrl()
  link: string;
}

export class ExperienceDto {
  @ApiPropertyOptional({ example: 'OpenAI' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiPropertyOptional({ example: 'ML Engineer' })
  @IsString()
  @IsNotEmpty()
  position: string;

  @ApiPropertyOptional({ example: '2023-01-10' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2024-06-10' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Casablanca' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Morocco' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class EducationDto {
  @ApiPropertyOptional({ example: 'MIT' })
  @IsString()
  @IsNotEmpty()
  school: string;

  @ApiPropertyOptional({ example: 'Bachelor' })
  @IsString()
  @IsNotEmpty()
  degree: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiPropertyOptional({ example: '2019-09-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2023-06-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Cambridge' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class LanguageDto {
  @ApiPropertyOptional({ example: 'French' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiPropertyOptional({ enum: LanguageLevel, example: LanguageLevel.NATIVE })
  @IsEnum(LanguageLevel)
  level: LanguageLevel;
}

export class SkillDto {
  @ApiPropertyOptional({ example: 'NestJS' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 4 })
  @IsNumber()
  @Min(1)
  level: number;
}

export class ProjectDto {
  @ApiPropertyOptional({ example: 'TalentBridge AI CV Generator' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/project' })
  @IsOptional()
  @IsUrl()
  url?: string;
}

export class CertificationDto {
  @ApiPropertyOptional({ example: 'AWS Certified Cloud Practitioner' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Amazon' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ example: '2024-02-01' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ example: 'https://example.com/credential' })
  @IsOptional()
  @IsUrl()
  credentialUrl?: string;

  @ApiPropertyOptional({ example: '/uploads/profiles/certifications/1234.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class UserBasicProfileDto {
  @ApiPropertyOptional({ example: 'jane.doe@email.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.site.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({ example: '+212600000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Casablanca, Morocco' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}

export class CandidateProfilePayloadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  professionalSummary?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  openToWork?: boolean;

  @ApiPropertyOptional({ example: 25000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  desiredSalary?: number;

  @ApiPropertyOptional({ example: 'Backend Engineer' })
  @IsOptional()
  @IsString()
  desiredPosition?: string;

  @ApiPropertyOptional({ type: [SocialLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @ApiPropertyOptional({ type: [ExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ type: [LanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @ApiPropertyOptional({ type: [SkillDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @ApiPropertyOptional({ type: [ProjectDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];

  @ApiPropertyOptional({ type: [CertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];
}
