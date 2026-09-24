import { Inject, Injectable } from '@nestjs/common';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import {
  FriendshipEntity,
  FriendshipStatus,
} from 'src/modules/friendship/domain/friendship.entity';
import { FriendRequestSentEvent } from 'src/modules/friendship/domain/friend-request-sent.event';
import { EVENT_BUS, IEventBus } from 'src/shared/events/event-bus';
import {
  CannotFriendSelfException,
  FriendshipAlreadyExistsException,
  FriendshipBlockedException,
  UserNotFoundException,
} from 'src/shared/exceptions/domain-exceptions';

export interface SendFriendRequestCommand {
  requesterId: string;
  recipientId: string;
}

// Tạo friend request mới: validate user tồn tại, không tự kết bạn, chưa có quan hệ pending/accepted,
// và không bên nào đang chặn bên kia.
@Injectable()
export class SendFriendRequestUseCase {
  constructor(
    @Inject(IFriendshipRepository)
    private readonly friendshipRepo: IFriendshipRepository,
    @Inject(IUserRepository) private readonly userRepo: IUserRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(cmd: SendFriendRequestCommand): Promise<FriendshipEntity> {
    if (cmd.requesterId === cmd.recipientId) {
      throw new CannotFriendSelfException();
    }

    const recipient = await this.userRepo.findById(cmd.recipientId);
    if (!recipient) throw new UserNotFoundException(cmd.recipientId);

    // Nếu đã có document bất kỳ giữa 2 user → chặn (pending/accepted/blocked đều không cho tạo mới).
    const existing = await this.friendshipRepo.findBetween(
      cmd.requesterId,
      cmd.recipientId,
    );
    if (existing) {
      if (existing.status === FriendshipStatus.Blocked)
        throw new FriendshipBlockedException();
      throw new FriendshipAlreadyExistsException();
    }

    const friendship = FriendshipEntity.createRequest({
      requesterId: cmd.requesterId,
      recipientId: cmd.recipientId,
    });
    const saved = await this.friendshipRepo.save(friendship);

    this.eventBus.publish(
      new FriendRequestSentEvent(
        saved.id!,
        saved.requesterId,
        saved.recipientId,
      ),
    );

    return saved;
  }
}
