import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { UpdateCompanyPayloadDto } from './company.dto';

export class UpdateRecruiterCompanyDto {
  @ApiPropertyOptional({
    description: 'Attach recruiter to an existing company',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    description:
      'Update company details for the company currently linked to recruiter',
    type: UpdateCompanyPayloadDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompanyPayloadDto)
  company?: UpdateCompanyPayloadDto;
}
