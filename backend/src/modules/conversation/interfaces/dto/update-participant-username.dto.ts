import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMyParticipantUsernameDto {
  @ApiProperty({
    example: 'Cún yêu',
    description: 'Nickname mới trong conversation',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  username: string;
}
