import { ConversationEntity } from './conversation.entity';

export abstract class IConversationRepository {
  // Mọi find() mặc định BỎ QUA document đã soft-delete (deletedAt != null).
  abstract findById(id: string): Promise<ConversationEntity | null>;
  abstract findByUserId(userId: string): Promise<ConversationEntity[]>;
  abstract save(conversation: ConversationEntity): Promise<ConversationEntity>;
  abstract update(conversation: ConversationEntity): Promise<ConversationEntity>;
  // Atomic set deletedAt = now. Không thật sự xóa document.
  abstract softDelete(id: string): Promise<void>;
}

export const CONVERSATION_REPOSITORY = IConversationRepository;
