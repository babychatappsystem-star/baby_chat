import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import {
  ConversationNotFoundException,
  FileAccessDeniedException,
  FileNotFoundException,
  NotConversationAdminException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';

export interface UpdateConversationAvatarCommand {
  conversationId: string;
  userId: string;
  fileId: string;
}

// Gán avatar cho conversation. Quy tắc quyền giống delete: chỉ creator/admin.
// File phải thuộc về người gọi (chống dùng file người khác).
@Injectable()
export class UpdateConversationAvatarUseCase {
  constructor(
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
    @Inject(IFileRepository) private readonly fileRepository: IFileRepository,
  ) {}

  async execute(
    cmd: UpdateConversationAvatarCommand,
  ): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findById(
      cmd.conversationId,
    );
    if (!conversation)
      throw new ConversationNotFoundException(cmd.conversationId);

    if (!conversation.isParticipant(cmd.userId)) {
      throw new NotParticipantException(cmd.userId);
    }
    const isCreator = conversation.createdBy === cmd.userId;
    const role = conversation.getParticipantRole(cmd.userId);
    if (!isCreator && role !== 'admin') {
      throw new NotConversationAdminException(cmd.userId);
    }

    const file = await this.fileRepository.findById(cmd.fileId);
    if (!file) throw new FileNotFoundException(cmd.fileId);
    if (!file.isOwnedBy(cmd.userId)) throw new FileAccessDeniedException();

    conversation.setAvatarFile(cmd.fileId);
    return this.conversationRepository.update(conversation);
  }
}
