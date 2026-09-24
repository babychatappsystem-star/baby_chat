import mongoose from 'mongoose';
import {
  FriendshipEntity,
  FriendshipStatus,
} from 'src/modules/friendship/domain/friendship.entity';
import { FriendshipDocument } from './friendship.schema';

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

export class FriendshipMapper {
  static toDomain(doc: FriendshipDocument): FriendshipEntity {
    return FriendshipEntity.reconstitute({
      id: String(doc._id),
      requesterId: doc.requesterId.toString(),
      recipientId: doc.recipientId.toString(),
      status: doc.status as FriendshipStatus,
      acceptedAt: doc.acceptedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(entity: FriendshipEntity): Record<string, any> {
    return {
      requesterId: toObjectId(entity.requesterId),
      recipientId: toObjectId(entity.recipientId),
      status: entity.status,
      acceptedAt: entity.acceptedAt,
    };
  }
}
