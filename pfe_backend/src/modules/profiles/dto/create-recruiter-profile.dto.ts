import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { UserBasicProfileDto } from './common-profile.dto';
import { Type } from 'class-transformer';
import { CompanyPayloadDto } from './company.dto';

class RecruiterProfilePayloadDto {
  @ApiPropertyOptional({
    description: 'Attach recruiter to an existing company',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Create a company and attach recruiter to it',
    type: CompanyPayloadDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyPayloadDto)
  company?: CompanyPayloadDto;

  @ApiProperty({ example: 'Senior Talent Acquisition Specialist' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  position: string;

  @ApiProperty({ example: 'Human Resources' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  department: string;
}

export class CreateRecruiterProfileDto extends IntersectionType(
  UserBasicProfileDto,
  RecruiterProfilePayloadDto,
) {}
