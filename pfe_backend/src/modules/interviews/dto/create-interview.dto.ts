import { InterviewType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInterviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsEnum(InterviewType)
  interviewType: InterviewType;

  @IsDateString()
  scheduledAt: string;

  @IsInt()
  @Min(15)
  @Max(480)
  duration: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;

  @IsOptional()
  @IsBoolean()
  sendInvitation?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsUUID()
  candidateId: string;

  @IsUUID()
  jobOfferId: string;
}
