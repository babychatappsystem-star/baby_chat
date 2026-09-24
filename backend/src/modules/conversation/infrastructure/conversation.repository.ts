import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import { ConversationDocument } from './conversation.schema';
import { ConversationMapper } from './conversation.mapper';

// Implementation của IConversationRepository dùng Mongoose.
@Injectable()
export class ConversationRepository implements IConversationRepository {
  constructor(
    @InjectModel(ConversationDocument.name)
    private readonly convModel: Model<ConversationDocument>,
  ) {}

  // Lấy conversation theo id, null nếu không tồn tại hoặc đã soft-deleted.
  // { deletedAt: { $eq: null } } match cả document không có field (data cũ) lẫn null.
  async findById(id: string): Promise<ConversationEntity | null> {
    const doc = await this.convModel.findOne({
      _id: id,
      deletedAt: { $eq: null },
    });
    return doc ? ConversationMapper.toDomain(doc) : null;
  }

  // Tìm tất cả conversation mà user tham gia, bỏ qua document đã soft-deleted.
  async findByUserId(userId: string): Promise<ConversationEntity[]> {
    const docs = await this.convModel.find({
      participants: {
        $elemMatch: { userId: new mongoose.Types.ObjectId(userId) },
      },
      deletedAt: { $eq: null },
    });
    return docs.map((doc) => ConversationMapper.toDomain(doc));
  }

  // Persist entity mới (insert).
  async save(entity: ConversationEntity): Promise<ConversationEntity> {
    const data = ConversationMapper.toPersistence(entity);
    const created = await this.convModel.create(data);
    return ConversationMapper.toDomain(created);
  }

  // Update toàn bộ document theo id (overwrite các field từ entity).
  async update(entity: ConversationEntity): Promise<ConversationEntity> {
    const data = ConversationMapper.toPersistence(entity);
    const updated = await this.convModel.findByIdAndUpdate(entity.id, data, {
      new: true,
    });
    if (!updated) throw new Error(`Conversation ${entity.id} not found`);
    return ConversationMapper.toDomain(updated);
  }

  // Set deletedAt = now. Idempotent — update lại không sao.
  async softDelete(id: string): Promise<void> {
    await this.convModel.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date() } },
    );
  }
}
