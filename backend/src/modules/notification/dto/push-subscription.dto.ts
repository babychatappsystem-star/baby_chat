import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PushSubscriptionKeysDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class PushSubscriptionDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: false })
  endpoint: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
}

export class UnsubscribePushDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: false })
  endpoint: string;
}
