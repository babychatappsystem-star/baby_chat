import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// User info công khai trả về client. Bỏ password và mọi field nội bộ.
export class UserPublicDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;
}

// Response trả về sau khi đăng nhập / đăng ký thành công.
export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token, dùng cho Bearer Auth' })
  access_token: string;

  @ApiProperty({ description: 'Refresh token, dùng để xin access token mới' })
  refresh_token: string;

  @ApiProperty({ example: 86400, description: 'Số giây còn lại đến khi access_token hết hạn' })
  access_token_expires_in: number;

  @ApiProperty({ example: '2026-05-27T10:00:00.000Z', description: 'Thời điểm access_token hết hạn (ISO 8601)' })
  access_token_expires_at: Date;

  @ApiProperty({ example: 604800, description: 'Số giây còn lại đến khi refresh_token hết hạn' })
  refresh_token_expires_in: number;

  @ApiProperty({ example: '2026-06-02T10:00:00.000Z', description: 'Thời điểm refresh_token hết hạn (ISO 8601)' })
  refresh_token_expires_at: Date;

  @ApiProperty({ type: UserPublicDto })
  user: UserPublicDto;
}

// Response cho /auth/profile — query từ DB để có cả avatar.
export class ProfileResponseDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  userId: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'johndoe', required: false })
  username?: string;

  @ApiPropertyOptional({ example: '/uploads/abc.webp', description: 'URL avatar (null nếu chưa đặt)' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: '/uploads/thumb_abc.webp', description: 'URL thumbnail avatar (null nếu chưa đặt)' })
  thumbnailUrl?: string | null;

  @ApiProperty({ example: false })
  hidePresence: boolean;

  @ApiProperty({ example: ['user'], required: false, type: [String] })
  roles?: string[];

  @ApiPropertyOptional({ example: 5 })
  expressiveChatThresholds?: number;

  @ApiPropertyOptional({ example: 300 })
  expressiveChatTransitionTime?: number;

  @ApiPropertyOptional({ example: ['🙂', '😀', '😄', '😆', '😂'], type: [String] })
  expressiveChatEmojis?: string[];
}

// Response cho /auth/logout.
export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message: string;
}
