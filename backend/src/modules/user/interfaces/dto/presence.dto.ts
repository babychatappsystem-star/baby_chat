import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePresenceSettingsDto {
  @ApiProperty({ description: 'Ẩn trạng thái hoạt động khỏi bạn bè' })
  @IsBoolean()
  hidePresence: boolean;
}

export class FriendPresenceItemDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  online: boolean;

  @ApiProperty({ required: false })
  lastSeenAt?: string;
}
