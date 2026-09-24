import { UserEntity } from 'src/modules/user/domain/user.entity';
import { UserDocument } from './user.schema';

// Mapper convert giữa Mongoose document và domain entity.
// Domain layer không biết về Mongoose; mapper là cầu nối duy nhất.
export class UserMapper {
  // Document → Entity. Convert ObjectId thành string, đẩy hết field qua reconstitute.
  static toDomain(doc: UserDocument): UserEntity {
    return UserEntity.reconstitute({
      id: String(doc._id),
      username: doc.username,
      email: doc.email,
      password: doc.password,
      displayName: doc.displayName,
      dateOfBirth: doc.dateOfBirth,
      createdAt: doc.createdAt,
      friendCode: doc.friendCode,
      avatarFileId: doc.avatarFileId,
      lastSeenAt: doc.lastSeenAt,
      hidePresence: doc.hidePresence,
      expressiveChatThresholds: doc.expressiveChatThresholds,
      expressiveChatTransitionTime: doc.expressiveChatTransitionTime,
      expressiveChatEmojis: doc.expressiveChatEmojis,
      pushSubscriptions: doc.pushSubscriptions,
    });
  }

  // Entity → object để Mongoose lưu. Trả Partial vì _id do DB tự sinh khi insert.
  static toPersistence(entity: UserEntity): Partial<UserDocument> {
    return {
      username: entity.username,
      email: entity.email,
      password: entity.password,
      displayName: entity.displayName,
      dateOfBirth: entity.dateOfBirth,
      friendCode: entity.friendCode,
      avatarFileId: entity.avatarFileId,
      expressiveChatThresholds: entity.expressiveChatThresholds,
      expressiveChatTransitionTime: entity.expressiveChatTransitionTime,
      expressiveChatEmojis: entity.expressiveChatEmojis,
      pushSubscriptions: entity.pushSubscriptions,
    };
  }
}
