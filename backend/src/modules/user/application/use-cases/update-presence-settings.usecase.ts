import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { PresenceService } from 'src/modules/realtime/presence/presence.service';
import { ChatGateway } from 'src/modules/realtime/gateway/chat.gateway';
import { WS_EVENTS } from 'src/modules/realtime/events/ws-events';
import { userRoom } from 'src/modules/realtime/gateway/chat.gateway';

// Toggle hidePresence; sau đó emit WS event để bạn bè thấy trạng thái đổi ngay.
@Injectable()
export class UpdatePresenceSettingsUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IFriendshipRepository)
    private readonly friendshipRepository: IFriendshipRepository,
    private readonly presenceService: PresenceService,
    private readonly gateway: ChatGateway,
  ) {}

  async execute(userId: string, hidePresence: boolean): Promise<void> {
    await this.userRepository.updateHidePresence(userId, hidePresence);

    const friendIds = await this.friendshipRepository.getFriendIds(userId);
    if (friendIds.length === 0) return;

    if (hidePresence) {
      // Ẩn trạng thái: emit offline ngay, ẩn lastSeen
      for (const fid of friendIds) {
        this.gateway.server
          .to(userRoom(fid))
          .emit(WS_EVENTS.PRESENCE_OFFLINE, { userId, lastSeenAt: null });
      }
    } else {
      // Bỏ ẩn: nếu đang có kết nối thì emit online
      if (this.presenceService.isConnected(userId)) {
        for (const fid of friendIds) {
          this.gateway.server
            .to(userRoom(fid))
            .emit(WS_EVENTS.PRESENCE_ONLINE, { userId });
        }
      }
    }
  }
}
