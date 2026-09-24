import { Inject, Injectable } from '@nestjs/common';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import { FriendshipNotFoundException } from 'src/shared/exceptions/domain-exceptions';

export interface CancelFriendRequestCommand {
  friendshipId: string;
  cancelledByUserId: string;
}

// Hủy lời mời đã gửi: chỉ requester được phép, chỉ khi status còn pending.
// Sau khi accepted/blocked thì không cho cancel — trả 404 chung để không leak state.
@Injectable()
export class CancelFriendRequestUseCase {
  constructor(
    @Inject(IFriendshipRepository)
    private readonly friendshipRepo: IFriendshipRepository,
  ) {}

  async execute(cmd: CancelFriendRequestCommand): Promise<void> {
    const friendship = await this.friendshipRepo.findById(cmd.friendshipId);
    if (
      !friendship ||
      friendship.status !== FriendshipStatus.Pending ||
      friendship.requesterId !== cmd.cancelledByUserId
    ) {
      throw new FriendshipNotFoundException(cmd.friendshipId);
    }

    await this.friendshipRepo.delete(friendship.id!);
  }
}
