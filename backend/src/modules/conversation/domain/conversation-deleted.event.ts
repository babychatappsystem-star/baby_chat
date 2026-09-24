import { DomainEvent } from 'src/shared/events/domain-event.base';

export class ConversationDeletedEvent extends DomainEvent {
  readonly eventName = 'conversation.deleted';

  constructor(public readonly conversationId: string) {
    super();
  }
}
