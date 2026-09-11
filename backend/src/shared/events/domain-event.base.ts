/**
 * Base class for all Domain Events.
 * Domain events represent something that happened in the domain
 * that other parts of the system might be interested in.
 */
export abstract class DomainEvent {
  readonly occurredAt: Date;
  abstract readonly eventName: string;

  protected constructor() {
    this.occurredAt = new Date();
  }
}
