import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetUserSuspensionDto {
  @ApiProperty({
    description: 'Whether account should remain active',
    example: false,
  })
  @IsBoolean()
  isActive: boolean;
}
