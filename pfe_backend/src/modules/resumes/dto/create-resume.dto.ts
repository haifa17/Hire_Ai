import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export enum ResumeLanguageEnum {
  EN = 'EN',
  FR = 'FR',
}

export class CreateResumeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(ResumeLanguageEnum)
  @IsNotEmpty()
  language: ResumeLanguageEnum;

  @ValidateIf((dto) => !dto.jobOfferId)
  @IsString()
  @IsNotEmpty()
  jobDescription?: string;

  @ValidateIf((dto) => !dto.jobDescription)
  @IsUUID()
  jobOfferId?: string;

  @IsOptional()
  @IsString()
  template?: string;
}
