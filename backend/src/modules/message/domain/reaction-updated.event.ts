import { DomainEvent } from 'src/shared/events/domain-event.base';

export interface ReactionUpdatedProps {
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
  action: 'add' | 'remove';
}

export class ReactionUpdatedEvent extends DomainEvent {
  public readonly eventName = 'reaction.updated';
  public readonly messageId: string;
  public readonly conversationId: string;
  public readonly userId: string;
  public readonly emoji: string;
  public readonly action: 'add' | 'remove';

  constructor(props: ReactionUpdatedProps) {
    super();
    this.messageId = props.messageId;
    this.conversationId = props.conversationId;
    this.userId = props.userId;
    this.emoji = props.emoji;
    this.action = props.action;
  }
}
