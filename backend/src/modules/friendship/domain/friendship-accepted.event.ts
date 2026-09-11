import { DomainEvent } from 'src/shared/events/domain-event.base';

// Phát ra khi 1 friend request được accept. Listener trong ConversationsModule
// dùng event này để auto-tạo direct conversation giữa 2 user (nếu chưa có).
export class FriendshipAcceptedEvent extends DomainEvent {
  readonly eventName = 'friendship.accepted';

  constructor(
    public readonly friendshipId: string,
    public readonly requesterId: string,
    public readonly recipientId: string,
  ) {
    super();
  }
}
