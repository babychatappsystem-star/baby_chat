import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IPageRepository, PAGE_REPOSITORY } from 'src/modules/message/domain/i-page.repository';
import {
  ConversationNotFoundException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';
import { IEventBus, EVENT_BUS } from 'src/shared/events/event-bus';
import { ReactionUpdatedEvent } from 'src/modules/message/domain/reaction-updated.event';

export interface AddReactionCommand {
  conversationId: string;
  messageId: string;
  userId: string;
  emoji: string;
}

@Injectable()
export class AddReactionUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: IPageRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(command: AddReactionCommand): Promise<void> {
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
      throw new Error('Message not found');
    }

    const added = message.addReaction(command.userId, command.emoji);
    if (added) {
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
          action: 'add',
        }),
      );
    }
  }
}
