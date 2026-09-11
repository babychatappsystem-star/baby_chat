import { DomainEvent } from 'src/shared/events/domain-event.base';

export class ConversationCreatedEvent extends DomainEvent {
  readonly eventName = 'conversation.created';

  constructor(
    public readonly conversationId: string,
    public readonly type: string,
    public readonly createdByUserId: string,
    public readonly participantUserIds: string[],
  ) {
    super();
  }
}
