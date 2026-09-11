import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { normalizeFriendCode } from 'src/modules/user/domain/friend-code';
import { FriendshipEntity } from 'src/modules/friendship/domain/friendship.entity';
import { SendFriendRequestUseCase } from './send-friend-request.usecase';
import { UserNotFoundException } from 'src/shared/exceptions/domain-exceptions';

export interface SendFriendRequestByCodeCommand {
  requesterId: string;
  friendCode: string;
}

// Gửi friend request qua friend code thay vì userId. Lookup code → userId,
// rồi delegate cho SendFriendRequestUseCase (mọi validation tái sử dụng).
@Injectable()
export class SendFriendRequestByCodeUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    private readonly sendFriendRequest: SendFriendRequestUseCase,
  ) {}

  async execute(cmd: SendFriendRequestByCodeCommand): Promise<FriendshipEntity> {
    const normalized = normalizeFriendCode(cmd.friendCode);
    if (!normalized) throw new UserNotFoundException();
    const recipient = await this.userRepository.findByFriendCode(normalized);
    if (!recipient || !recipient.id) throw new UserNotFoundException();

    return this.sendFriendRequest.execute({
      requesterId: cmd.requesterId,
      recipientId: recipient.id,
    });
  }
}
