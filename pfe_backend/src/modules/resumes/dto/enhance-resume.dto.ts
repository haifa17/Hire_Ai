import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ResumeLanguageEnum } from './create-resume.dto';

export class EnhanceResumeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(ResumeLanguageEnum)
  language: ResumeLanguageEnum;

  @IsString()
  @IsOptional()
  jobDescription?: string;

  @IsString()
  @IsOptional()
  jobOfferId?: string;

  @IsString()
  @IsOptional()
  template?: string;
}
