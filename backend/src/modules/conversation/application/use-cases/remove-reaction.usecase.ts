import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IPageRepository, PAGE_REPOSITORY } from 'src/modules/message/domain/i-page.repository';
import {
  ConversationNotFoundException,
  MessageNotFoundException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';
import { IEventBus, EVENT_BUS } from 'src/shared/events/event-bus';
import { ReactionUpdatedEvent } from 'src/modules/message/domain/reaction-updated.event';

export interface RemoveReactionCommand {
  conversationId: string;
  messageId: string;
  userId: string;
  emoji: string;
}

@Injectable()
export class RemoveReactionUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: IPageRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(command: RemoveReactionCommand): Promise<void> {
    const conversation = await this.conversationRepository.findById(command.conversationId);
    if (!conversation) throw new ConversationNotFoundException(command.conversationId);

    if (!conversation.isParticipant(command.userId)) {
      throw new NotParticipantException(command.userId);
    }

    const message = await this.pageRepository.findMessageById(
      command.conversationId,
      command.messageId,
    );
    if (!message) {
      throw new MessageNotFoundException(command.messageId);
    }

    const removed = message.removeReaction(command.userId, command.emoji);
    if (removed) {
      await this.pageRepository.updateMessageReactions(
        command.conversationId,
        command.messageId,
        message.reactions,
      );

      this.eventBus.publish(
        new ReactionUpdatedEvent({
          messageId: command.messageId,
          conversationId: command.conversationId,
          userId: command.userId,
          emoji: command.emoji,
          action: 'remove',
        }),
      );
    }
  }
}
