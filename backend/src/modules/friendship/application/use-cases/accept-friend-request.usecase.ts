import { Inject, Injectable } from '@nestjs/common';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipEntity } from 'src/modules/friendship/domain/friendship.entity';
import { FriendshipAcceptedEvent } from 'src/modules/friendship/domain/friendship-accepted.event';
import { EVENT_BUS, IEventBus } from 'src/shared/events/event-bus';
import {
  FriendshipNotFoundException,
  NotFriendshipRecipientException,
} from 'src/shared/exceptions/domain-exceptions';

export interface AcceptFriendRequestCommand {
  friendshipId: string;
  acceptedByUserId: string;
}

// Chỉ recipient mới được accept. Sau khi accept publish event để Conversation tự tạo direct conv.
@Injectable()
export class AcceptFriendRequestUseCase {
  constructor(
    @Inject(IFriendshipRepository)
    private readonly friendshipRepo: IFriendshipRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(cmd: AcceptFriendRequestCommand): Promise<FriendshipEntity> {
    const friendship = await this.friendshipRepo.findById(cmd.friendshipId);
    if (!friendship) throw new FriendshipNotFoundException(cmd.friendshipId);

    if (cmd.acceptedByUserId !== friendship.recipientId) {
      throw new NotFriendshipRecipientException();
    }

    friendship.accept(cmd.acceptedByUserId);
    const updated = await this.friendshipRepo.update(friendship);

    this.eventBus.publish(
      new FriendshipAcceptedEvent(
        updated.id!,
        updated.requesterId,
        updated.recipientId,
      ),
    );

    return updated;
  }
}
