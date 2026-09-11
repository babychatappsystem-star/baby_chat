import { Inject, Injectable } from '@nestjs/common';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipEntity, FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';

// Danh sách bạn (accepted) của user, trả về cả 2 chiều.
@Injectable()
export class ListFriendsUseCase {
  constructor(
    @Inject(IFriendshipRepository) private readonly friendshipRepo: IFriendshipRepository,
  ) {}

  execute(userId: string): Promise<FriendshipEntity[]> {
    return this.friendshipRepo.findByUserAndStatus(userId, FriendshipStatus.Accepted);
  }
}

// Lời mời đang chờ user duyệt.
@Injectable()
export class ListIncomingRequestsUseCase {
  constructor(
    @Inject(IFriendshipRepository) private readonly friendshipRepo: IFriendshipRepository,
  ) {}

  execute(userId: string): Promise<FriendshipEntity[]> {
    return this.friendshipRepo.findPendingIncoming(userId);
  }
}

// Lời mời user đã gửi đi, chưa được duyệt.
@Injectable()
export class ListOutgoingRequestsUseCase {
  constructor(
    @Inject(IFriendshipRepository) private readonly friendshipRepo: IFriendshipRepository,
  ) {}

  execute(userId: string): Promise<FriendshipEntity[]> {
    return this.friendshipRepo.findPendingOutgoing(userId);
  }
}
