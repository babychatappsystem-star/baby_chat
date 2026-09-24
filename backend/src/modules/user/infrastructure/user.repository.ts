import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserEntity } from 'src/modules/user/domain/user.entity';
import { UserDocument } from './user.schema';
import { UserMapper } from './user.mapper';

// Implementation của IUserRepository dùng Mongoose.
// Mọi return đều đi qua UserMapper để domain layer không phụ thuộc Mongoose document.
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(@InjectModel(UserDocument.name) private readonly userModel: Model<UserDocument>) {}

  // Tìm user theo MongoId. Dùng .lean() để trả plain object (nhanh hơn document).
  async findById(id: string): Promise<UserEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.userModel.findById(id).lean();
    return doc ? UserMapper.toDomain(doc as UserDocument) : null;
  }

  // Batch fetch nhiều user theo id; lọc id rỗng/lặp để tránh query thừa.
  async findByIds(ids: string[]): Promise<UserEntity[]> {
    const unique = Array.from(new Set(ids.filter((id) => !!id)));
    if (unique.length === 0) return [];
    const docs = await this.userModel.find({ _id: { $in: unique } }).lean();
    return docs.map((doc) => UserMapper.toDomain(doc as UserDocument));
  }

  // Tìm theo email — luôn lowercase trước khi query để khớp với cách lưu.
  async findByEmail(email: string): Promise<UserEntity | null> {
    const doc = await this.userModel.findOne({ email: email.toLowerCase() }).lean();
    return doc ? UserMapper.toDomain(doc as UserDocument) : null;
  }

  // Check tồn tại không cần load document — dùng countDocuments cho nhẹ.
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.userModel.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }

  // Persist entity mới. Mongo tự sinh _id, mapper convert ngược về domain entity với id.
  async save(entity: UserEntity): Promise<UserEntity> {
    const data = UserMapper.toPersistence(entity);
    const created = await this.userModel.create(data);
    return UserMapper.toDomain(created);
  }

  // Tìm user theo friendCode (case-sensitive). Code được normalize uppercase ở use case.
  async findByFriendCode(code: string): Promise<UserEntity | null> {
    const doc = await this.userModel.findOne({ friendCode: code }).lean();
    return doc ? UserMapper.toDomain(doc as UserDocument) : null;
  }

  // Atomic set friendCode. Trả false khi duplicate key (code đã có người khác giữ).
  // Caller chịu trách nhiệm retry với code mới.
  async setFriendCode(userId: string, code: string): Promise<boolean> {
    try {
      const result = await this.userModel.updateOne(
        { _id: userId },
        { $set: { friendCode: code } },
      );
      return result.matchedCount > 0;
    } catch (err: any) {
      if (err?.code === 11000) return false;
      throw err;
    }
  }

  // Set avatarFileId, trả về user đã update.
  async updateAvatar(userId: string, fileId: string): Promise<UserEntity | null> {
    const doc = await this.userModel
      .findByIdAndUpdate(userId, { $set: { avatarFileId: fileId } }, { new: true })
      .lean();
    return doc ? UserMapper.toDomain(doc as UserDocument) : null;
  }

  // Xóa cứng theo id; chưa hỗ trợ soft delete.
  async delete(id: string): Promise<void> {
    await this.userModel.deleteOne({ _id: id });
  }

  // Lấy toàn bộ user (cẩn thận khi data lớn).
  async findAll(): Promise<UserEntity[]> {
    const docs = await this.userModel.find().lean();
    return docs.map((doc) => UserMapper.toDomain(doc as UserDocument));
  }

  // Ghi lastSeenAt; dùng updateOne (không cần trả document về).
  async updateLastSeen(userId: string, date: Date): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { lastSeenAt: date } });
  }

  // Toggle hidePresence; dùng updateOne để tránh load toàn bộ document.
  async updateHidePresence(userId: string, hide: boolean): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { hidePresence: hide } });
  }

  // Cập nhật cấu hình Expressive Chat
  async updateExpressiveChatSettings(userId: string, thresholds: number, transitionTime: number, emojis?: string[]): Promise<void> {
    const updateDoc: any = {
      expressiveChatThresholds: thresholds,
      expressiveChatTransitionTime: transitionTime,
    };
    if (emojis) {
      updateDoc.expressiveChatEmojis = emojis;
    }
    await this.userModel.updateOne(
      { _id: userId },
      { $set: updateDoc }
    );
  }

  // Web Push Notifications
  // Mỗi endpoint = 1 trình duyệt, chỉ thuộc về 1 user: gỡ khỏi mọi user (kể cả chính mình)
  // rồi mới gắn lại, để trình duyệt đổi tài khoản không nhận push của tài khoản cũ.
  async addPushSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> {
    const _id = this.toObjectId(userId);
    await this.userModel.updateMany(
      { 'pushSubscriptions.endpoint': subscription.endpoint },
      { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } },
    );
    await this.userModel.updateOne({ _id }, { $push: { pushSubscriptions: subscription } });
  }

  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    const _id = this.toObjectId(userId);
    await this.userModel.updateOne({ _id }, { $pull: { pushSubscriptions: { endpoint } } });
  }

  // Mongoose bỏ key undefined khỏi filter ({ _id: undefined } → {}), nên phải chặn trước
  // để update không bao giờ rơi vào document đầu tiên của collection.
  private toObjectId(userId: string): Types.ObjectId {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new Error(`Invalid userId: ${String(userId)}`);
    }
    return new Types.ObjectId(userId);
  }
}
