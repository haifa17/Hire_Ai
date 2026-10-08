import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateJobReportDto {
  @ApiProperty({ description: 'ID of the reported job offer' })
  @IsUUID()
  @IsNotEmpty()
  jobOfferId: string;

  @ApiProperty({ enum: ReportType, description: 'Type of report' })
  @IsEnum(ReportType)
  @IsNotEmpty()
  type: ReportType;

  @ApiProperty({ description: 'Detailed reason for reporting the job offer' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Reason must be at least 5 characters long' })
  @MaxLength(1000, { message: 'Reason must be at most 1000 characters long' })
  reason: string;
}
