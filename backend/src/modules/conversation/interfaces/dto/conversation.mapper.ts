import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import { MessageEntity } from 'src/modules/message/domain/message.entity';
import {
  ConversationResponseDto,
  MessageResponseDto,
  PageRefResponseDto,
} from './conversation-response.dto';

// Mapper biến domain entity (ConversationEntity, MessageEntity) thành DTO trả client.
// Tách biệt domain shape và transport shape — domain đổi không kéo theo break API.
export class ConversationResponseMapper {
  // avatarUrl resolve sẵn từ avatarFileId (caller dùng FileUrlResolver). Mặc định null.
  static toConversationDto(
    entity: ConversationEntity,
    avatarUrl?: string | null,
  ): ConversationResponseDto {
    return {
      id: entity.id ?? '',
      type: entity.type,
      name: entity.name,
      description: entity.description,
      avatar: entity.avatar,
      avatarUrl: avatarUrl ?? null,
      createdBy: entity.createdBy,
      participants: entity.participants.map((p) => ({
        userId: p.userId,
        username: p.username,
        role: p.role,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        isActive: p.isActive,
      })),
      settings: {
        isPrivate: entity.settings.isPrivate,
        allowInvites: entity.settings.allowInvites,
        mutedBy: [...entity.settings.mutedBy],
        pinnedBy: [...entity.settings.pinnedBy],
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // avatarUrlMap: avatarFileId → url, resolve sẵn batch để tránh N+1.
  static toConversationListDto(
    entities: ConversationEntity[],
    avatarUrlMap?: Map<string, string>,
  ): ConversationResponseDto[] {
    return entities.map((e) =>
      this.toConversationDto(e, e.avatarFileId ? avatarUrlMap?.get(e.avatarFileId) : null),
    );
  }

  // fileUrl resolve sẵn từ fileId (caller dùng FileUrlResolver). Mặc định null.
  // Chỉ trả fileUrl cho image message — chặn rò URL nếu data cũ/lỗi có fileId trên text message (lỗ hổng #1).
  static toMessageDto(entity: MessageEntity, fileUrl?: string | null): MessageResponseDto {
    return {
      id: entity.id,
      senderId: entity.senderId,
      content: entity.content,
      type: entity.type,
      fileUrl: entity.type === 'image' ? (fileUrl ?? null) : null,
      replyId: entity.replyId,
      replySnippet: entity.replySnippet,
      replySenderId: entity.replySenderId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // fileUrlMap: fileId → url, resolve sẵn batch tránh N+1. Chỉ lookup cho image message.
  static toMessageListDto(
    entities: MessageEntity[],
    fileUrlMap?: Map<string, string>,
  ): MessageResponseDto[] {
    return entities.map((e) =>
      this.toMessageDto(e, e.type === 'image' && e.fileId ? fileUrlMap?.get(e.fileId) : null),
    );
  }

  static toPageRefDto(result: {
    totalPages: number;
    limit: number;
    items: Array<{ pageNumber: number; pageId: string; messageCount: number }>;
  }): PageRefResponseDto {
    return {
      totalPages: result.totalPages,
      limit: result.limit,
      items: result.items.map((i) => ({ ...i })),
    };
  }
}
