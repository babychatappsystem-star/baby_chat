import { DomainEvent } from 'src/shared/events/domain-event.base';

export class ConversationReadEvent extends DomainEvent {
  readonly eventName = 'conversation.read';

  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly readAt: Date,
  ) {
    super();
  }
}
