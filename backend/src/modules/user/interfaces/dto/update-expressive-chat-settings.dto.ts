import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateExpressiveChatSettingsDto {
  @ApiProperty({ description: 'Number of emotion thresholds', example: 5, minimum: 2, maximum: 5 })
  @IsInt()
  @Min(2)
  @Max(5)
  thresholds: number;

  @ApiProperty({ description: 'Transition time between thresholds (ms)', example: 300, minimum: 100, maximum: 2000 })
  @IsInt()
  @Min(100)
  @Max(2000)
  transitionTime: number;
}
