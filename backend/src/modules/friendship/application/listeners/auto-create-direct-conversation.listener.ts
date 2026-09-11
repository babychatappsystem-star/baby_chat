import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FriendshipAcceptedEvent } from 'src/modules/friendship/domain/friendship-accepted.event';
import { CreateConversationUseCase } from 'src/modules/conversation/application/use-cases/create-conversation.usecase';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';

// Khi friendship được accept, tự động tạo direct conversation giữa 2 user.
// Nếu đã có sẵn 1 direct conv giữa họ thì bỏ qua (idempotent) — tránh duplicate
// khi 2 user từng kết bạn → unfriend → kết bạn lại.
@Injectable()
export class AutoCreateDirectConversationListener {
  private readonly logger = new Logger(AutoCreateDirectConversationListener.name);

  constructor(
    private readonly createConversation: CreateConversationUseCase,
    @Inject(IConversationRepository) private readonly conversationRepo: IConversationRepository,
  ) {}

  @OnEvent('friendship.accepted')
  async handle(event: FriendshipAcceptedEvent): Promise<void> {
    try {
      const existing = await this.conversationRepo.findByUserId(event.requesterId);
      const alreadyExists = existing.some(
        (c) =>
          c.type === 'direct' &&
          c.participants.length === 2 &&
          c.isParticipant(event.requesterId) &&
          c.isParticipant(event.recipientId),
      );
      if (alreadyExists) {
        this.logger.debug(
          `Direct conversation already exists for ${event.requesterId} & ${event.recipientId}`,
        );
        return;
      }

      await this.createConversation.execute({
        type: 'direct',
        createdByUserId: event.requesterId,
        participantUserIds: [event.recipientId],
      });
    } catch (err) {
      // Không throw để tránh phá luồng accept; chỉ log lại để debug.
      this.logger.error(
        `Failed to auto-create direct conversation for friendship ${event.friendshipId}`,
        err as any,
      );
    }
  }
}
