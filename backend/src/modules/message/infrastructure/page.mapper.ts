import mongoose from 'mongoose';
import { PageEntity } from 'src/modules/message/domain/page.entity';
import { MessageEntity } from 'src/modules/message/domain/message.entity';
import { PageDocument } from './page.schema';

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

// Mapper convert PageDocument ↔ PageEntity (kèm reconstitute cho từng MessageSubdoc).
export class PageMapper {
  // Document → Entity. Mỗi message subdoc có _id riêng → reconstitute thành MessageEntity.
  static toDomain(doc: PageDocument): PageEntity {
    const messages = (doc.messages ?? []).map((m) =>
      MessageEntity.reconstitute({
        id: m._id.toString(),
        senderId: m.senderId.toString(),
        content: m.content,
        type: m.type as any,
        fileId: m.fileId,
        replyId: m.replyId?.toString(),
        replySnippet: m.replySnippet,
        replySenderId: m.replySenderId?.toString(),
        stickerId: m.stickerId?.toString(),
        stickerUrl: m.stickerUrl,
        reactions: (m.reactions ?? []).map((r) => ({
          userId: r.userId.toString(),
          emoji: r.emoji,
        })),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }),
    );

    return PageEntity.reconstitute({
      id: (doc._id as any).toString(),
      conversationId: doc.conversationId.toString(),
      pageNumber: doc.pageNumber,
      pageSize: doc.pageSize,
      messages,
      messageCount: doc.messageCount,
      startTime: doc.startTime,
      endTime: doc.endTime,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    });
  }

  // Entity → object cho Mongoose. Convert tất cả id (conversationId, senderId, replyId)
  // thành ObjectId để khớp schema và populate được.
  static toPersistence(entity: PageEntity): Record<string, any> {
    return {
      conversationId: toObjectId(entity.conversationId),
      pageNumber: entity.pageNumber,
      pageSize: entity.pageSize,
      messageCount: entity.messageCount,
      startTime: entity.startTime,
      endTime: entity.endTime,
      messages: entity.messages.map((m) => ({
        senderId: toObjectId(m.senderId),
        content: m.content,
        type: m.type,
        fileId: m.fileId,
        replyId: m.replyId ? toObjectId(m.replyId) : null,
        replySnippet: m.replySnippet,
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
