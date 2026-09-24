import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FriendshipEntity } from 'src/modules/friendship/domain/friendship.entity';

// Thông tin "đối phương" của friendship so với user hiện tại.
export class FriendUserDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e3' })
  userId: string;

  @ApiProperty({ example: 'johndoe', nullable: true })
  username: string | null;

  @ApiPropertyOptional({ example: '/uploads/abc.webp', nullable: true })
  avatarUrl?: string | null;
}

export class FriendshipResponseDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  id: string;

  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e2' })
  requesterId: string;

  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e3' })
  recipientId: string;

  @ApiProperty({ enum: ['pending', 'accepted', 'blocked'], example: 'pending' })
  status: string;

  @ApiPropertyOptional({ example: '2026-05-25T10:00:00.000Z', nullable: true })
  acceptedAt?: Date;

  @ApiPropertyOptional({ example: '2026-05-25T09:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-05-25T10:00:00.000Z' })
  updatedAt?: Date;

  @ApiPropertyOptional({
    type: FriendUserDto,
    description: 'Thông tin user đối diện so với user hiện tại',
  })
  friend?: FriendUserDto;
}

export class FriendshipResponseMapper {
  // toDto đơn giản — không kèm username. Dùng cho các action endpoint trả 1 record.
  static toDto(entity: FriendshipEntity): FriendshipResponseDto {
    return {
      id: entity.id!,
      requesterId: entity.requesterId,
      recipientId: entity.recipientId,
      status: entity.status,
      acceptedAt: entity.acceptedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // toListDtoWithFriend hydrate field `friend` (userId + username) cho mỗi entity
  // bằng cách tra usernameMap. currentUserId dùng để xác định ai là "đối phương".
  static toListDtoWithFriend(
    entities: FriendshipEntity[],
    currentUserId: string,
    userMetaMap: Map<string, { username: string; avatarUrl: string | null }>,
  ): FriendshipResponseDto[] {
    return entities.map((e) => {
      const friendUserId = e.otherUserId(currentUserId);
      return {
        ...this.toDto(e),
        friend: {
          userId: friendUserId,
          username: userMetaMap.get(friendUserId)?.username ?? null,
          avatarUrl: userMetaMap.get(friendUserId)?.avatarUrl ?? null,
        },
      };
    });
  }
}
