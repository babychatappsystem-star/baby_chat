import { ApiProperty } from '@nestjs/swagger';

export class FriendCodeResponseDto {
  @ApiProperty({ example: 'A7F2K9XP', description: '8 ký tự alphanumeric (loại bỏ 0/O, 1/I/L)' })
  friendCode: string;
}
