import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { PageEntity } from 'src/modules/message/domain/page.entity';
import { MessageEntity } from 'src/modules/message/domain/message.entity';
import { DuplicatePageNumberError } from 'src/modules/message/domain/errors';
import { PageDocument } from './page.schema';
import { PageMapper } from './page.mapper';
import { errorCode } from 'src/shared/utils/error-code';
import { MessageCipher, messageAad } from 'src/shared/crypto/message-cipher';

// Implementation của IPageRepository dùng Mongoose.
// Page là bucket chứa tối đa pageSize tin nhắn — giảm số document trong DB.
@Injectable()
export class PageRepository implements IPageRepository {
  constructor(
    @InjectModel(PageDocument.name)
    private readonly pageModel: Model<PageDocument>,
    private readonly cipher: MessageCipher,
  ) {}

  // Lấy page theo id, null nếu không tồn tại.
  async findById(id: string): Promise<PageEntity | null> {
    const doc = await this.pageModel.findById(id);
    return doc ? PageMapper.toDomain(doc, this.cipher) : null;
  }

  // Lấy toàn bộ page của conversation theo pageNumber tăng dần — caller dựa vào
  // phần tử cuối là page mới nhất.
  async findByConversationId(conversationId: string): Promise<PageEntity[]> {
    const docs = await this.pageModel
      .find({ conversationId: new mongoose.Types.ObjectId(conversationId) })
      .sort({ pageNumber: 1 });
    return docs.map((doc) => PageMapper.toDomain(doc, this.cipher));
  }

  // Lấy 1 page cụ thể của conversation theo số trang. Index unique đảm bảo có tối đa 1 kết quả.
  async findByConversationIdAndPageNumber(
    conversationId: string,
    pageNumber: number,
  ): Promise<PageEntity | null> {
    const doc = await this.pageModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      pageNumber,
    });
    return doc ? PageMapper.toDomain(doc, this.cipher) : null;
  }

  // Persist entity mới. Mongo tự sinh _id và _id cho từng message subdoc.
  // Bắt E11000 (duplicate key) khi 2 request đồng thời cùng cố tạo pageNumber giống nhau
  // → throw DuplicatePageNumberError để use case retry với pageNumber mới.
  async save(entity: PageEntity): Promise<PageEntity> {
    const data = PageMapper.toPersistence(entity, this.cipher);
    try {
      const created = await this.pageModel.create(data);
      return PageMapper.toDomain(created, this.cipher);
    } catch (err) {
      if (errorCode(err) === 11000) {
        throw new DuplicatePageNumberError(
          entity.conversationId,
          entity.pageNumber,
        );
      }
      throw err;
    }
  }

  // Atomic push message vào page. $expr đảm bảo không push khi page đã đầy
  // → tránh race condition giữa nhiều request gửi tin cùng lúc.
  async addMessage(
    pageId: string,
    message: MessageEntity,
  ): Promise<PageEntity> {
    const updated = await this.pageModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(pageId),
        $expr: { $lt: ['$messageCount', '$pageSize'] },
      },
      {
        $push: {
          messages: {
            _id: new mongoose.Types.ObjectId(message.id),
            senderId: new mongoose.Types.ObjectId(message.senderId),
            content: this.cipher.encryptField(
              message.content,
              messageAad(message.id, 'content'),
            ),
            type: message.type,
            fileId: message.fileId,
            replyId: message.replyId
              ? new mongoose.Types.ObjectId(message.replyId)
              : null,
            replySnippet: this.cipher.encryptField(
              message.replySnippet,
              messageAad(message.id, 'replySnippet'),
            ),
            replySenderId: message.replySenderId
              ? new mongoose.Types.ObjectId(message.replySenderId)
              : undefined,
            stickerId: message.stickerId
              ? new mongoose.Types.ObjectId(message.stickerId)
              : undefined,
            stickerUrl: message.stickerUrl,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          },
        },
        $inc: { messageCount: 1 },
      },
      { new: true },
    );
    if (!updated) throw new Error(`Page ${pageId} not found or already full`);
    return PageMapper.toDomain(updated, this.cipher);
  }

  // Helper trả về mảng tin nhắn của 1 page; rỗng nếu page không tồn tại.
  async getMessagesByPageNumber(
    conversationId: string,
    pageNumber: number,
  ): Promise<MessageEntity[]> {
    const page = await this.findByConversationIdAndPageNumber(
      conversationId,
      pageNumber,
    );
    return page ? [...page.messages] : [];
  }

  // Tìm 1 message theo id. Quét các page của conversation (subdoc array nên không index riêng).
  // Trong thực tế reply thường nhắc tin nhắn ở page mới nhất → loop từ cuối lên cho nhanh.
  async findMessageById(
    conversationId: string,
    messageId: string,
  ): Promise<MessageEntity | null> {
    const msgObjectId = new mongoose.Types.ObjectId(messageId);
    const doc = await this.pageModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      'messages._id': msgObjectId,
    });
    if (!doc) return null;
    const page = PageMapper.toDomain(doc, this.cipher);
    return page.messages.find((m) => m.id === messageId) ?? null;
  }

  async updateMessageReactions(
    conversationId: string,
    messageId: string,
    reactions: { userId: string; emoji: string }[],
  ): Promise<void> {
    const msgObjectId = new mongoose.Types.ObjectId(messageId);
    await this.pageModel.updateOne(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        'messages._id': msgObjectId,
      },
      {
        $set: {
          'messages.$.reactions': reactions.map((r) => ({
            userId: new mongoose.Types.ObjectId(r.userId),
            emoji: r.emoji,
          })),
        },
      },
    );
  }

  // 1 aggregation cho mọi hội thoại. Chỉ quét page có updatedAt > mốc đọc (updatedAt
  // đổi mỗi lần push tin) và không đọc content — không cần giải mã.
  async countUnreadByConversation(
    userId: string,
    since: Array<{ conversationId: string; since: Date }>,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (since.length === 0) return counts;
    const entries = since.map((s) => ({
      conversationId: new mongoose.Types.ObjectId(s.conversationId),
      since: s.since,
    }));
    const rows = await this.pageModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      count: number;
    }>([
      {
        $match: {
          $or: entries.map((e) => ({
            conversationId: e.conversationId,
            updatedAt: { $gt: e.since },
          })),
        },
      },
      { $unwind: '$messages' },
      {
        $match: {
          'messages.senderId': { $ne: new mongoose.Types.ObjectId(userId) },
          $or: entries.map((e) => ({
            conversationId: e.conversationId,
            'messages.createdAt': { $gt: e.since },
          })),
        },
      },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ]);
    for (const row of rows) counts.set(row._id.toString(), row.count);
    return counts;
  }

  async getLatestMessage(
    conversationId: string,
  ): Promise<MessageEntity | null> {
    const doc = await this.pageModel
      .findOne({
        conversationId: new mongoose.Types.ObjectId(conversationId),
      })
      .sort({ pageNumber: -1 });

    if (!doc || doc.messages.length === 0) return null;
    const page = PageMapper.toDomain(doc, this.cipher);
    return page.messages[page.messages.length - 1];
  }
}
