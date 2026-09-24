import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { PresenceService } from 'src/modules/realtime/presence/presence.service';

export interface FriendPresenceDto {
  userId: string;
  online: boolean;
  lastSeenAt?: string; // ISO 8601, undefined khi đang online hoặc ẩn trạng thái
}

// Lấy trạng thái presence của tất cả bạn bè — dùng khi FE bootstrap (mở app lần đầu).
@Injectable()
export class GetFriendsPresenceUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IFriendshipRepository)
    private readonly friendshipRepository: IFriendshipRepository,
    private readonly presenceService: PresenceService,
  ) {}

  async execute(userId: string): Promise<FriendPresenceDto[]> {
    const friendIds = await this.friendshipRepository.getFriendIds(userId);
    if (friendIds.length === 0) return [];

    // Batch fetch users để lấy hidePresence + lastSeenAt
    const users = await this.userRepository.findByIds(friendIds);
    const userMap = new Map(users.map((u) => [u.id!, u]));

    return friendIds.map((fid) => {
      const user = userMap.get(fid);
      if (!user) return { userId: fid, online: false };

      const status = this.presenceService.getStatus(fid, user.hidePresence);
      return {
        userId: fid,
        online: status.online,
        lastSeenAt: status.online ? undefined : user.lastSeenAt?.toISOString(),
      };
    });
  }
}
