import { IsString, IsArray, ArrayMinSize, ValidateNested, IsOptional, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ParticipantInputDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  userId: string;
}

export class CreateConvDto {
  @ApiProperty({ enum: ['direct', 'group', 'channel'], example: 'direct' })
  @IsString()
  @IsIn(['direct', 'group', 'channel'])
  type: string;

  @ApiPropertyOptional({ example: 'My Group' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Group description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ type: [ParticipantInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one participant is required' })
  @ValidateNested({ each: true })
  @Type(() => ParticipantInputDto)
  participants: ParticipantInputDto[];
}
