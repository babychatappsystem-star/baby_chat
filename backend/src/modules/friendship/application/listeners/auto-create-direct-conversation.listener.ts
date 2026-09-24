import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FriendshipAcceptedEvent } from 'src/modules/friendship/domain/friendship-accepted.event';
import { CreateConversationUseCase } from 'src/modules/conversation/application/use-cases/create-conversation.usecase';

// Khi friendship được accept, tự động tạo direct conversation giữa 2 user.
// CreateConversationUseCase trả lại conversation cũ nếu 2 người đã có direct conv
// (trường hợp kết bạn → unfriend → kết bạn lại), nên không tạo trùng.
@Injectable()
export class AutoCreateDirectConversationListener {
  private readonly logger = new Logger(
    AutoCreateDirectConversationListener.name,
  );

  constructor(private readonly createConversation: CreateConversationUseCase) {}

  @OnEvent('friendship.accepted')
  async handle(event: FriendshipAcceptedEvent): Promise<void> {
    try {
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
