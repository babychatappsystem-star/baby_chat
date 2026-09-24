import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import {
  ConversationNotFoundException,
  NotConversationAdminException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';
import { IEventBus, EVENT_BUS } from 'src/shared/events/event-bus';
import { ConversationDeletedEvent } from 'src/modules/conversation/domain/conversation-deleted.event';

export interface DeleteConversationCommand {
  conversationId: string;
  userId: string;
}

// Soft delete conversation. Quy tắc:
// - direct: bất kỳ participant nào cũng được xóa (xóa khỏi view, conversation vẫn còn cho bên kia).
//   Lưu ý: implementation hiện tại xóa cho CẢ HAI vì soft-delete ở document level.
//   Nếu sau này cần "xóa chỉ cho một bên" → cần per-user hidden flag.
// - group/channel: chỉ creator hoặc participant role 'admin' mới được xóa.
@Injectable()
export class DeleteConversationUseCase {
  constructor(
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(cmd: DeleteConversationCommand): Promise<void> {
    const conversation = await this.conversationRepository.findById(
      cmd.conversationId,
    );
    if (!conversation)
      throw new ConversationNotFoundException(cmd.conversationId);

    if (!conversation.isParticipant(cmd.userId)) {
      throw new NotParticipantException(cmd.userId);
    }

    if (conversation.type !== 'direct') {
      const isCreator = conversation.createdBy === cmd.userId;
      const role = conversation.getParticipantRole(cmd.userId);
      if (!isCreator && role !== 'admin') {
        throw new NotConversationAdminException(cmd.userId);
      }
    }

    await this.conversationRepository.softDelete(cmd.conversationId);
    this.eventBus.publish(new ConversationDeletedEvent(cmd.conversationId));
  }
}
