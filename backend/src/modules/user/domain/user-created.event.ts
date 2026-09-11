import { DomainEvent } from 'src/shared/events/domain-event.base';

export class UserCreatedEvent extends DomainEvent {
  readonly eventName = 'user.created';

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
  ) {
    super();
  }
}
