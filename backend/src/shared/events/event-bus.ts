import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from 'src/shared/events/domain-event.base';

export const EVENT_BUS = 'EVENT_BUS';

export abstract class IEventBus {
  abstract publish(event: DomainEvent): void;
  abstract publishAll(events: DomainEvent[]): void;
}

/**
 * EventBus — infrastructure implementation using NestJS EventEmitter2.
 * Use cases publish events here; handlers subscribe via @OnEvent decorator.
 */
@Injectable()
export class EventBus extends IEventBus {
  private readonly logger = new Logger(EventBus.name);

  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  publish(event: DomainEvent): void {
    this.logger.debug(`Publishing event: ${event.eventName}`);
    this.emitter.emit(event.eventName, event);
  }

  publishAll(events: DomainEvent[]): void {
    events.forEach((event) => this.publish(event));
  }
}
