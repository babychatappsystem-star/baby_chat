import { Inject, Injectable } from '@nestjs/common';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { FriendshipEntity, FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import {
  CannotFriendSelfException,
  UserNotFoundException,
} from 'src/shared/exceptions/domain-exceptions';

export interface BlockUserCommand {
  blockerId: string;
  blockedId: string;
}

// Block: nếu đã có document giữa 2 user thì xóa và tạo lại với blocker = requester.
// Cách này đảm bảo invariant "requesterId của blocked record = người chặn" để
// repo.isBlockedBy() query đúng.
@Injectable()
export class BlockUserUseCase {
  constructor(
    @Inject(IFriendshipRepository) private readonly friendshipRepo: IFriendshipRepository,
    @Inject(IUserRepository) private readonly userRepo: IUserRepository,
  ) {}

  async execute(cmd: BlockUserCommand): Promise<FriendshipEntity> {
    if (cmd.blockerId === cmd.blockedId) throw new CannotFriendSelfException();

    const target = await this.userRepo.findById(cmd.blockedId);
    if (!target) throw new UserNotFoundException(cmd.blockedId);

    const existing = await this.friendshipRepo.findBetween(cmd.blockerId, cmd.blockedId);
    if (existing) {
      // Đã block sẵn bởi chính blocker → idempotent.
      if (
        existing.status === FriendshipStatus.Blocked &&
        existing.requesterId === cmd.blockerId
      ) {
        return existing;
      }
      await this.friendshipRepo.delete(existing.id!);
    }

    const block = FriendshipEntity.createBlock({
      requesterId: cmd.blockerId,
      recipientId: cmd.blockedId,
    });
    return this.friendshipRepo.save(block);
  }
}
