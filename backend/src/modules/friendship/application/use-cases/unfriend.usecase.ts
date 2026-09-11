import { Inject, Injectable } from '@nestjs/common';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import { FriendshipNotFoundException } from 'src/shared/exceptions/domain-exceptions';

export interface UnfriendCommand {
  userId: string;
  friendUserId: string;
}

// Xóa quan hệ accepted giữa 2 user. Không động đến record blocked/pending.
@Injectable()
export class UnfriendUseCase {
  constructor(
    @Inject(IFriendshipRepository) private readonly friendshipRepo: IFriendshipRepository,
  ) {}

  async execute(cmd: UnfriendCommand): Promise<void> {
    const friendship = await this.friendshipRepo.findBetween(cmd.userId, cmd.friendUserId);
    if (!friendship || friendship.status !== FriendshipStatus.Accepted) {
      throw new FriendshipNotFoundException();
    }
    await this.friendshipRepo.delete(friendship.id!);
  }
}
