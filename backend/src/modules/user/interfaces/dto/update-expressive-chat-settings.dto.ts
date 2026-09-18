import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateExpressiveChatSettingsDto {
  @ApiProperty({ description: 'Number of emotion thresholds', example: 5, minimum: 2, maximum: 10 })
  @IsInt()
  @Min(2)
  @Max(10)
  thresholds: number;

  @ApiProperty({ description: 'Transition time between thresholds (ms)', example: 300, minimum: 100, maximum: 2000 })
  @IsInt()
  @Min(100)
  @Max(2000)
  transitionTime: number;

  @ApiPropertyOptional({
    description: 'Custom list of expressive emojis (between 2 and 10 emojis)',
    example: ['🙂', '😀', '😄', '😆', '😂'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  emojis?: string[];
}
