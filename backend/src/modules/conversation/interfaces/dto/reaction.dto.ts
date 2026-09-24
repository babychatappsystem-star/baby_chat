import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReactionDto {
  // 32 đủ cho emoji ghép nhiều code point (ZWJ, skin tone, cờ).
  @ApiProperty({ example: '👍' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  emoji: string;
}
