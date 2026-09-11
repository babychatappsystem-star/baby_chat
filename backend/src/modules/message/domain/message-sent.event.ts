import { DomainEvent } from 'src/shared/events/domain-event.base';

export class MessageSentEvent extends DomainEvent {
  readonly eventName = 'message.sent';

  constructor(
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly messageId: string,
    public readonly content: string,
    public readonly pageId: string,
  ) {
    super();
  }
}
