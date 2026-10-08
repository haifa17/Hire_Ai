import { IsObject, IsOptional, IsString } from 'class-validator';

export class MatchingPreviewDto {
  @IsObject()
  candidate: Record<string, unknown>;

  @IsObject()
  jobOffer: Record<string, unknown>;

  @IsOptional()
  @IsString()
  language?: string;
}
