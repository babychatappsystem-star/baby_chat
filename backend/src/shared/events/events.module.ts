import { Global, Module } from '@nestjs/common';
import { EventBus, EVENT_BUS } from './event-bus';

@Global()
@Module({
  providers: [EventBus, { provide: EVENT_BUS, useClass: EventBus }],
  exports: [EVENT_BUS, EventBus],
})
export class EventsModule {}
