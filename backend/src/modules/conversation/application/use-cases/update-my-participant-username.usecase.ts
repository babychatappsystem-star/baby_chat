import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import {
  ConversationNotFoundException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';

export interface UpdateMyParticipantUsernameCommand {
  conversationId: string;
  userId: string;
  newUsername: string;
}

// Đổi username (nickname) của chính user hiện tại trong conversation. Không ảnh hưởng
// đến User.username gốc — đây là tên hiển thị riêng trong conversation này.
@Injectable()
export class UpdateMyParticipantUsernameUseCase {
  constructor(
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
  ) {}

  async execute(
    cmd: UpdateMyParticipantUsernameCommand,
  ): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findById(
      cmd.conversationId,
    );
    if (!conversation)
      throw new ConversationNotFoundException(cmd.conversationId);

    const participant = conversation.participants.find(
      (p) => p.userId === cmd.userId,
    );
    if (!participant) throw new NotParticipantException(cmd.userId);

    participant.rename(cmd.newUsername);

    return this.conversationRepository.update(conversation);
  }
}
