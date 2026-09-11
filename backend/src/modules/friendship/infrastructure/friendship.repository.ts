import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipEntity, FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import { FriendshipDocument } from './friendship.schema';
import { FriendshipMapper } from './friendship.mapper';

@Injectable()
export class FriendshipRepository implements IFriendshipRepository {
  constructor(
    @InjectModel(FriendshipDocument.name)
    private readonly model: Model<FriendshipDocument>,
  ) {}

  async findById(id: string): Promise<FriendshipEntity | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id);
    return doc ? FriendshipMapper.toDomain(doc) : null;
  }

  // Tìm document giữa 2 user theo cả 2 chiều, không lọc status — caller tự xử lý.
  async findBetween(userAId: string, userBId: string): Promise<FriendshipEntity | null> {
    const a = new mongoose.Types.ObjectId(userAId);
    const b = new mongoose.Types.ObjectId(userBId);
    const doc = await this.model.findOne({
      $or: [
        { requesterId: a, recipientId: b },
        { requesterId: b, recipientId: a },
      ],
    });
    return doc ? FriendshipMapper.toDomain(doc) : null;
  }

  // Với 'accepted' query cả 2 chiều; với 'pending'/'blocked' thường query 1 chiều
  // nên ở đây vẫn lấy cả 2 chiều cho thống nhất, caller filter thêm nếu cần.
  async findByUserAndStatus(
    userId: string,
    status: FriendshipStatus,
  ): Promise<FriendshipEntity[]> {
    const uid = new mongoose.Types.ObjectId(userId);
    const docs = await this.model.find({
      status,
      $or: [{ requesterId: uid }, { recipientId: uid }],
    });
    return docs.map((d) => FriendshipMapper.toDomain(d));
  }

  // Lời mời mà user đang chờ duyệt.
  async findPendingIncoming(userId: string): Promise<FriendshipEntity[]> {
    const uid = new mongoose.Types.ObjectId(userId);
    const docs = await this.model.find({ recipientId: uid, status: FriendshipStatus.Pending });
    return docs.map((d) => FriendshipMapper.toDomain(d));
  }

  // Lời mời user đã gửi đi mà chưa được duyệt.
  async findPendingOutgoing(userId: string): Promise<FriendshipEntity[]> {
    const uid = new mongoose.Types.ObjectId(userId);
    const docs = await this.model.find({ requesterId: uid, status: FriendshipStatus.Pending });
    return docs.map((d) => FriendshipMapper.toDomain(d));
  }

  // True nếu blocker đã có document blocked với blocked làm recipient.
  async isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
    const count = await this.model.countDocuments({
      requesterId: new mongoose.Types.ObjectId(blockerId),
      recipientId: new mongoose.Types.ObjectId(blockedId),
      status: FriendshipStatus.Blocked,
    });
    return count > 0;
  }

  async save(entity: FriendshipEntity): Promise<FriendshipEntity> {
    const data = FriendshipMapper.toPersistence(entity);
    const created = await this.model.create(data);
    return FriendshipMapper.toDomain(created);
  }

  async update(entity: FriendshipEntity): Promise<FriendshipEntity> {
    if (!entity.id) throw new Error('Cannot update friendship without id');
    const data = FriendshipMapper.toPersistence(entity);
    const updated = await this.model.findByIdAndUpdate(entity.id, data, { new: true });
    if (!updated) throw new Error(`Friendship ${entity.id} not found`);
    return FriendshipMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id });
  }
}
