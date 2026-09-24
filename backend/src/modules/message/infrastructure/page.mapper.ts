import { Logger } from '@nestjs/common';
import mongoose from 'mongoose';
import { MessageCipher, messageAad } from 'src/shared/crypto/message-cipher';
import { PageEntity } from 'src/modules/message/domain/page.entity';
import {
  MessageEntity,
  MessageType,
} from 'src/modules/message/domain/message.entity';
import { PageDocument } from './page.schema';

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const logger = new Logger('PageMapper');
export const UNDECRYPTABLE_MESSAGE = '[Message could not be decrypted]';

// Giải mã 1 field; lỗi (bị sửa, thiếu khoá cũ) chỉ ảnh hưởng tin đó, không làm hỏng cả page.
const decryptField = (
  cipher: MessageCipher,
  value: string | undefined,
  messageId: string,
  field: 'content' | 'replySnippet',
): string | undefined => {
  if (!value) return value;
  try {
    return cipher.decrypt(value, messageAad(messageId, field));
  } catch (err) {
    logger.error(
      `Cannot decrypt ${field} of message ${messageId}: ${(err as Error).message}`,
    );
    return UNDECRYPTABLE_MESSAGE;
  }
};

// Mapper convert PageDocument ↔ PageEntity (kèm reconstitute cho từng MessageSubdoc).
export class PageMapper {
  // Document → Entity. Mỗi message subdoc có _id riêng → reconstitute thành MessageEntity.
  static toDomain(doc: PageDocument, cipher: MessageCipher): PageEntity {
    const messages = (doc.messages ?? []).map((m) => {
      const id = m._id.toString();
      return MessageEntity.reconstitute({
        id,
        senderId: m.senderId.toString(),
        content: decryptField(cipher, m.content, id, 'content') ?? '',
        type: m.type as MessageType,
        fileId: m.fileId,
        replyId: m.replyId?.toString(),
        replySnippet: decryptField(cipher, m.replySnippet, id, 'replySnippet'),
        replySenderId: m.replySenderId?.toString(),
        stickerId: m.stickerId?.toString(),
        stickerUrl: m.stickerUrl,
        reactions: (m.reactions ?? []).map((r) => ({
          userId: r.userId.toString(),
          emoji: r.emoji,
        })),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      });
    });

    return PageEntity.reconstitute({
      id: String(doc._id),
      conversationId: doc.conversationId.toString(),
      pageNumber: doc.pageNumber,
      pageSize: doc.pageSize,
      messages,
      messageCount: doc.messageCount,
      startTime: doc.startTime,
      endTime: doc.endTime,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  // Entity → object cho Mongoose. Convert tất cả id (conversationId, senderId, replyId)
  // thành ObjectId để khớp schema và populate được.
  static toPersistence(
    entity: PageEntity,
    cipher: MessageCipher,
  ): Record<string, any> {
    return {
      conversationId: toObjectId(entity.conversationId),
      pageNumber: entity.pageNumber,
      pageSize: entity.pageSize,
      messageCount: entity.messageCount,
      startTime: entity.startTime,
      endTime: entity.endTime,
      messages: entity.messages.map((m) => ({
        _id: toObjectId(m.id),
        senderId: toObjectId(m.senderId),
        content: cipher.encryptField(m.content, messageAad(m.id, 'content')),
        type: m.type,
        fileId: m.fileId,
        replyId: m.replyId ? toObjectId(m.replyId) : null,
        replySnippet: cipher.encryptField(
          m.replySnippet,
          messageAad(m.id, 'replySnippet'),
        ),
        replySenderId: m.replySenderId
          ? toObjectId(m.replySenderId)
          : undefined,
        stickerId: m.stickerId ? toObjectId(m.stickerId) : undefined,
        stickerUrl: m.stickerUrl,
        reactions: m.reactions.map((r) => ({
          userId: toObjectId(r.userId),
          emoji: r.emoji,
        })),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  }
}
