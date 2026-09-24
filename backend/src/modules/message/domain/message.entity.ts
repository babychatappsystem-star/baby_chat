import { generateObjectIdHex } from 'src/shared/utils/id-generator';
import { InvalidMessageException } from 'src/shared/exceptions/sticker-exceptions';
import { DomainError } from 'src/shared/exceptions/domain-error';

// Độ dài snippet lưu kèm để render reply UI. Cắt ngắn nhưng đủ để user nhận ra context.
export const REPLY_SNIPPET_MAX_LENGTH = 80;

// Mỗi page chứa tới 100 tin trong 1 document — giới hạn này giữ page xa ngưỡng 16MB của MongoDB.
export const MESSAGE_CONTENT_MAX_LENGTH = 4000;

export type MessageType = 'text' | 'image' | 'sticker';

export interface CreateMessageProps {
  senderId: string;
  content: string;
  type?: MessageType;
  fileId?: string;
  replyId?: string;
  replySnippet?: string;
  replySenderId?: string;
  reactions?: Array<{ userId: string; emoji: string }>;
  stickerId?: string;
  stickerUrl?: string;
}

export class MessageEntity {
  // Luôn có id ngay khi create — sinh client-side để biết chính xác id khi push
  // subdoc vào page. Optional chỉ để tương thích reconstitute từ data cũ chưa có id.
  readonly id: string;
  readonly senderId: string;
  readonly content: string;
  readonly type: MessageType;
  readonly fileId?: string;
  readonly replyId?: string;
  readonly replySnippet?: string;
  readonly replySenderId?: string;
  readonly reactions: Array<{ userId: string; emoji: string }>;
  readonly stickerId?: string;
  readonly stickerUrl?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    senderId: string;
    content: string;
    type: MessageType;
    fileId?: string;
    replyId?: string;
    replySnippet?: string;
    replySenderId?: string;
    reactions: Array<{ userId: string; emoji: string }>;
    stickerId?: string;
    stickerUrl?: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.senderId = props.senderId;
    this.content = props.content;
    this.type = props.type;
    this.fileId = props.fileId;
    this.replyId = props.replyId;
    this.replySnippet = props.replySnippet;
    this.replySenderId = props.replySenderId;
    this.reactions = props.reactions;
    this.stickerId = props.stickerId;
    this.stickerUrl = props.stickerUrl;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // Tạo message MỚI. Sinh id client-side (xem fix #4 review).
  // Lúc create thì updatedAt = createdAt — khi implement edit message sau này, cần
  // method riêng (vd MessageEntity.edit()) set updatedAt = new Date() và đánh dấu isEdited.
  static create(props: CreateMessageProps): MessageEntity {
    if (!props.senderId) {
      throw new DomainError('Sender ID is required');
    }

    // Defense-in-depth (lỗ hổng #2): chặn content non-string trước khi gọi .trim().
    // Cho phép undefined/null (image caption optional); mọi kiểu khác string là lỗi.
    if (
      props.content !== undefined &&
      props.content !== null &&
      typeof props.content !== 'string'
    ) {
      throw new DomainError('Message content must be a string');
    }
    if (props.content && props.content.length > MESSAGE_CONTENT_MAX_LENGTH) {
      throw new InvalidMessageException(
        `Message content cannot exceed ${MESSAGE_CONTENT_MAX_LENGTH} characters`,
      );
    }

    const type: MessageType = props.type ?? 'text';
    // Image message: fileId bắt buộc, content có thể rỗng (caption optional).
    // Sticker message: stickerId và stickerUrl bắt buộc, content có thể rỗng.
    // Text message: content bắt buộc.
    if (type === 'image') {
      if (!props.fileId) {
        throw new InvalidMessageException('Image message requires a fileId');
      }
    } else if (type === 'sticker') {
      if (!props.stickerId || !props.stickerUrl) {
        throw new InvalidMessageException(
          'Sticker message requires a stickerId and stickerUrl',
        );
      }
    } else if (!props.content || props.content.trim().length === 0) {
      throw new InvalidMessageException('Message content cannot be empty');
    }

    const now = new Date();
    return new MessageEntity({
      id: generateObjectIdHex(),
      senderId: props.senderId,
      content: props.content?.trim() ?? '',
      type,
      fileId: props.fileId,
      replyId: props.replyId,
      replySnippet: props.replySnippet?.slice(0, REPLY_SNIPPET_MAX_LENGTH),
      replySenderId: props.replySenderId,
      reactions: props.reactions ?? [],
      stickerId: props.stickerId,
      stickerUrl: props.stickerUrl,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Khôi phục entity từ dữ liệu DB (đã có id, đã hợp lệ — không validate lại).
  static reconstitute(props: {
    id: string;
    senderId: string;
    content: string;
    type?: MessageType;
    fileId?: string;
    replyId?: string;
    replySnippet?: string;
    replySenderId?: string;
    reactions?: Array<{ userId: string; emoji: string }>;
    stickerId?: string;
    stickerUrl?: string;
    createdAt: Date;
    updatedAt: Date;
  }): MessageEntity {
    // Data cũ không có type → default 'text'.
    return new MessageEntity({
      ...props,
      type: props.type ?? 'text',
      reactions: props.reactions ?? [],
    });
  }

  addReaction(userId: string, emoji: string): boolean {
    const exists = this.reactions.some(
      (r) => r.userId === userId && r.emoji === emoji,
    );
    if (exists) return false;
    this.reactions.push({ userId, emoji });
    // Note: domain event will be handled by UseCase manually if not using an aggregate root event queue.
    return true;
  }

  removeReaction(userId: string, emoji: string): boolean {
    const idx = this.reactions.findIndex(
      (r) => r.userId === userId && r.emoji === emoji,
    );
    if (idx === -1) return false;
    this.reactions.splice(idx, 1);
    return true;
  }
}
