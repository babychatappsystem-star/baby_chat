import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserEntity } from 'src/modules/user/domain/user.entity';

// Public projection của user — không lộ password và các field nội bộ.
// Dùng cho mọi endpoint trả user info công khai (search, ...).
export class UserPublicDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '/uploads/abc.webp', description: 'URL avatar (null nếu chưa đặt)' })
  avatarUrl?: string | null;

  // avatarUrl resolve sẵn từ fileId (caller dùng FileUrlResolver). Mặc định null.
  static fromEntity(entity: UserEntity, avatarUrl?: string | null): UserPublicDto {
    return {
      id: entity.id!,
      username: entity.username,
      email: entity.email,
      avatarUrl: avatarUrl ?? null,
    };
  }
}
