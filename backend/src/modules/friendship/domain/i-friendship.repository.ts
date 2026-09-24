import { FriendshipEntity, FriendshipStatus } from './friendship.entity';

export abstract class IFriendshipRepository {
  abstract findById(id: string): Promise<FriendshipEntity | null>;

  // Tìm bất kỳ document nào giữa 2 user (cả 2 chiều), bất kể status.
  abstract findBetween(
    userAId: string,
    userBId: string,
  ): Promise<FriendshipEntity | null>;

  // Danh sách friendship của user theo status. Với 'accepted' trả về cả 2 chiều.
  abstract findByUserAndStatus(
    userId: string,
    status: FriendshipStatus,
  ): Promise<FriendshipEntity[]>;

  // Danh sách lời mời pending mà userId là recipient (incoming) hoặc requester (outgoing).
  abstract findPendingIncoming(userId: string): Promise<FriendshipEntity[]>;
  abstract findPendingOutgoing(userId: string): Promise<FriendshipEntity[]>;

  // Check user A đã chặn user B chưa (B = recipient của block của A).
  abstract isBlockedBy(blockerId: string, blockedId: string): Promise<boolean>;

  // Lấy danh sách userId của bạn bè đã accept. Dùng để broadcast presence event.
  abstract getFriendIds(userId: string): Promise<string[]>;

  abstract save(entity: FriendshipEntity): Promise<FriendshipEntity>;
  abstract update(entity: FriendshipEntity): Promise<FriendshipEntity>;
  abstract delete(id: string): Promise<void>;
}

export const FRIENDSHIP_REPOSITORY = IFriendshipRepository;
