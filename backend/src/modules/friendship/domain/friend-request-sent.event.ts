import { DomainEvent } from 'src/shared/events/domain-event.base';

// Phát ra khi A gửi friend request cho B. Listener WS dùng event này để
// notify realtime cho B (friendship.request_received).
export class FriendRequestSentEvent extends DomainEvent {
  readonly eventName = 'friendship.request_sent';

  constructor(
    public readonly friendshipId: string,
    public readonly requesterId: string,
    public readonly recipientId: string,
  ) {
    super();
  }
}
