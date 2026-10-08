import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** A job offer found outside the platform, pasted in by the candidate. */
export class ExternalOfferDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  /** Full offer text; the AI service extracts skills and requirements from it. */
  @IsString()
  @MinLength(80)
  @MaxLength(20000)
  description: string;
}

/**
 * Match the signed-in candidate's profile against one offer: either a
 * published offer on the platform (`jobOfferId`) or an external one
 * (`externalOffer`). Exactly one of the two must be provided; the service
 * enforces this.
 */
export class MatchOfferDto {
  @IsOptional()
  @IsUUID()
  jobOfferId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExternalOfferDto)
  externalOffer?: ExternalOfferDto;

  @IsOptional()
  @IsIn(['en', 'fr'])
  language?: string;
}
