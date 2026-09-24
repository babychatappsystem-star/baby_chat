import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { ConversationReadEvent } from 'src/modules/conversation/domain/conversation-read.event';
import { IEventBus, EVENT_BUS } from 'src/shared/events/event-bus';
import {
  ConversationNotFoundException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';

export interface MarkConversationReadCommand {
  conversationId: string;
  userId: string;
}

// Đánh dấu user đã đọc hết hội thoại tới thời điểm hiện tại, rồi báo các thiết bị
// khác của chính user (qua socket) để badge chưa đọc đồng bộ.
@Injectable()
export class MarkConversationReadUseCase {
  constructor(
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(cmd: MarkConversationReadCommand): Promise<void> {
    const conversation = await this.conversationRepository.findById(
      cmd.conversationId,
    );
    if (!conversation)
      throw new ConversationNotFoundException(cmd.conversationId);
    if (!conversation.isParticipant(cmd.userId))
      throw new NotParticipantException(cmd.userId);

    const readAt = new Date();
    await this.conversationRepository.markRead(
      cmd.conversationId,
      cmd.userId,
      readAt,
    );
    this.eventBus.publish(
      new ConversationReadEvent(cmd.conversationId, cmd.userId, readAt),
    );
  }
}
