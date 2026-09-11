import { DomainEvent } from 'src/shared/events/domain-event.base';

export class ParticipantJoinedEvent extends DomainEvent {
  readonly eventName = 'conversation.participant_joined';

  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly role: string,
  ) {
    super();
  }
}
