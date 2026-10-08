import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OptimizeResumeDto {
  @IsNotEmpty()
  resumeContent: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missingKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestions?: string[];
}
