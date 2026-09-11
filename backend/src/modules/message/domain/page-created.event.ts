import { DomainEvent } from 'src/shared/events/domain-event.base';

export class PageCreatedEvent extends DomainEvent {
  readonly eventName = 'page.created';

  constructor(
    public readonly pageId: string,
    public readonly conversationId: string,
    public readonly pageNumber: number,
  ) {
    super();
  }
}
