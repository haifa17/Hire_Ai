import { IntersectionType } from '@nestjs/swagger';
import {
  CandidateProfilePayloadDto,
  UserBasicProfileDto,
} from './common-profile.dto';

export class CreateCandidateProfileDto extends IntersectionType(
  UserBasicProfileDto,
  CandidateProfilePayloadDto,
) {}
