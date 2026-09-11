import mongoose from 'mongoose';
import { ConversationEntity, ConversationSettings } from 'src/modules/conversation/domain/conversation.entity';
import { ParticipantEntity, ParticipantRole } from 'src/modules/conversation/domain/participant.entity';
import { ConversationDocument } from './conversation.schema';

// Helper convert string id sang ObjectId — bắt buộc khi lưu để các query
// dùng ref/$elemMatch khớp đúng kiểu BSON.
const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

// Mapper convert ConversationDocument ↔ ConversationEntity.
export class ConversationMapper {
  // Document → Entity. Convert tất cả ObjectId nested (participants, settings, pages.list) về string.
  static toDomain(doc: ConversationDocument): ConversationEntity {
    const participants = (doc.participants ?? []).map((p) =>
      ParticipantEntity.reconstitute({
        userId: p.userId.toString(),
        // Fallback empty cho document cũ chưa có field (data legacy) — đỡ crash.
        // Code mới luôn require username khi tạo participant.
        username: p.username ?? '',
        role: p.role as ParticipantRole,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        isActive: p.isActive ?? false,
      }),
    );

    const settings: ConversationSettings = {
      isPrivate: doc.settings?.isPrivate ?? false,
      allowInvites: doc.settings?.allowInvites ?? true,
      mutedBy: (doc.settings?.mutedBy ?? []).map((id) => id.toString()),
      pinnedBy: (doc.settings?.pinnedBy ?? []).map((id) => id.toString()),
    };

    return ConversationEntity.reconstitute({
      id: (doc._id as any).toString(),
      type: doc.type as any,
      name: doc.name,
      description: doc.description,
      avatar: doc.avatar,
      avatarFileId: doc.avatarFileId,
      createdBy: doc.createdBy?.toString(),
      participants,
      settings,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
      deletedAt: doc.deletedAt,
    });
  }

  // Entity → object cho Mongoose. Convert tất cả id string thành ObjectId
  // để query bằng ref/populate hoạt động đúng.
  static toPersistence(entity: ConversationEntity): Record<string, any> {
    return {
      type: entity.type,
      name: entity.name,
      description: entity.description,
      avatar: entity.avatar,
      avatarFileId: entity.avatarFileId,
      createdBy: toObjectId(entity.createdBy),
      participants: entity.participants.map((p) => ({
        userId: toObjectId(p.userId),
        username: p.username,
        role: p.role,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        isActive: p.isActive,
      })),
      settings: {
        isPrivate: entity.settings.isPrivate,
        allowInvites: entity.settings.allowInvites,
        mutedBy: entity.settings.mutedBy.map(toObjectId),
        pinnedBy: entity.settings.pinnedBy.map(toObjectId),
      },
      deletedAt: entity.deletedAt ?? null,
    };
  }
}
