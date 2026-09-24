import { Inject, Injectable } from '@nestjs/common';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import { FriendshipNotFoundException } from 'src/shared/exceptions/domain-exceptions';

export interface UnblockUserCommand {
  unblockerId: string;
  blockedId: string;
}

// Bỏ chặn: chỉ xóa nếu document blocked do chính unblocker tạo.
@Injectable()
export class UnblockUserUseCase {
  constructor(
    @Inject(IFriendshipRepository)
    private readonly friendshipRepo: IFriendshipRepository,
  ) {}

  async execute(cmd: UnblockUserCommand): Promise<void> {
    const existing = await this.friendshipRepo.findBetween(
      cmd.unblockerId,
      cmd.blockedId,
    );
    if (
      !existing ||
      existing.status !== FriendshipStatus.Blocked ||
      existing.requesterId !== cmd.unblockerId
    ) {
      throw new FriendshipNotFoundException();
    }
    await this.friendshipRepo.delete(existing.id!);
  }
}
