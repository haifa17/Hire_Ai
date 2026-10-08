import { PartialType } from '@nestjs/swagger';
import { CreateRecruiterProfileDto } from './create-recruiter-profile.dto';

export class UpdateRecruiterProfileDto extends PartialType(
  CreateRecruiterProfileDto,
) {}
