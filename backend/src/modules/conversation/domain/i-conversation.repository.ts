import { ConversationEntity } from './conversation.entity';

export abstract class IConversationRepository {
  // Mọi find() mặc định BỎ QUA document đã soft-delete (deletedAt != null).
  abstract findById(id: string): Promise<ConversationEntity | null>;
  abstract findByUserId(userId: string): Promise<ConversationEntity[]>;
  abstract save(conversation: ConversationEntity): Promise<ConversationEntity>;
  abstract update(
    conversation: ConversationEntity,
  ): Promise<ConversationEntity>;
  // Đẩy mốc đã đọc của userId lên `at` (không bao giờ lùi lại).
  abstract markRead(
    conversationId: string,
    userId: string,
    at: Date,
  ): Promise<void>;
  // Đặt mốc đã đọc = `at` cho các hội thoại mà userId chưa có mốc (dữ liệu cũ).
  abstract initLastReadAt(
    conversationIds: string[],
    userId: string,
    at: Date,
  ): Promise<void>;
  // Atomic set deletedAt = now. Không thật sự xóa document.
  abstract softDelete(id: string): Promise<void>;
}

export const CONVERSATION_REPOSITORY = IConversationRepository;
