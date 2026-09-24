import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, Length } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ID người nhận lời mời',
  })
  @IsMongoId()
  recipientId: string;
}

export class SendFriendRequestByCodeDto {
  @ApiProperty({
    example: 'A7F2K9XP',
    description: 'Friend code của người nhận (8 ký tự)',
  })
  @IsString()
  @Length(8, 16)
  friendCode: string;
}

export class BlockUserDto {
  @ApiProperty({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ID user cần chặn',
  })
  @IsMongoId()
  userId: string;
}
