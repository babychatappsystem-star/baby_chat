import { Inject, Injectable } from '@nestjs/common';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import {
  FriendshipNotFoundException,
  NotFriendshipRecipientException,
} from 'src/shared/exceptions/domain-exceptions';

export interface RejectFriendRequestCommand {
  friendshipId: string;
  rejectedByUserId: string;
}

// Reject = xóa hẳn document để requester có thể gửi lại sau này.
@Injectable()
export class RejectFriendRequestUseCase {
  constructor(
    @Inject(IFriendshipRepository) private readonly friendshipRepo: IFriendshipRepository,
  ) {}

  async execute(cmd: RejectFriendRequestCommand): Promise<void> {
    const friendship = await this.friendshipRepo.findById(cmd.friendshipId);
    if (!friendship) throw new FriendshipNotFoundException(cmd.friendshipId);

    if (cmd.rejectedByUserId !== friendship.recipientId) {
      throw new NotFriendshipRecipientException();
    }

    await this.friendshipRepo.delete(friendship.id!);
  }
}
