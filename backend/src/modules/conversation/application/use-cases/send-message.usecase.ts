import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { DEFAULT_PAGE_SIZE } from 'src/modules/conversation/domain/conversation.entity';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { PageEntity } from 'src/modules/message/domain/page.entity';
import {
  MessageEntity,
  MessageType,
} from 'src/modules/message/domain/message.entity';
import { DuplicatePageNumberError } from 'src/modules/message/domain/errors';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import {
  ConversationNotFoundException,
  FileAccessDeniedException,
  FileNotAllowedForMessageTypeException,
  FileNotFoundException,
  FriendshipBlockedException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import {
  InvalidMessageException,
  StickerNotFoundException,
  StickerNotAllowedForMessageTypeException,
} from 'src/shared/exceptions/sticker-exceptions';
import { IStickerRepository } from 'src/modules/sticker/domain/i-sticker.repository';
import { IEventBus, EVENT_BUS } from 'src/shared/events/event-bus';
import { MessageSentEvent } from 'src/modules/message/domain/message-sent.event';
import { PageCreatedEvent } from 'src/modules/message/domain/page-created.event';

// Snippet lưu kèm tin reply. Ảnh/sticker không có chữ → nhãn thay thế (hiển thị trên UI
// nên dùng tiếng Anh); ảnh có caption thì dùng caption.
const replySnippetFor = (original: MessageEntity): string => {
  if (original.content) return original.content;
  if (original.type === 'image') return '[Photo]';
  if (original.type === 'sticker') return '[Sticker]';
  return '';
};

export interface SendMessageCommand {
  conversationId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  fileId?: string;
  replyId?: string;
  stickerId?: string;
}

// Use case gửi tin nhắn:
// 1. Check conversation tồn tại + sender là participant
// 2. Tìm page hiện tại; nếu chưa có hoặc đã đầy → tạo page mới
// 3. Atomic push message vào page (có check race khi page bị đầy đồng thời)
// 4. Retry tối đa 3 lần nếu page bị fill bởi request khác xen vào
// 5. Publish MessageSentEvent (+ PageCreatedEvent nếu page mới)
@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
    @Inject(IPageRepository) private readonly pageRepository: IPageRepository,
    @Inject(IFileRepository) private readonly fileRepository: IFileRepository,
    @Inject(IStickerRepository)
    private readonly stickerRepository: IStickerRepository,
    @Inject(IFriendshipRepository)
    private readonly friendshipRepository: IFriendshipRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(command: SendMessageCommand): Promise<MessageEntity> {
    const conversation = await this.conversationRepository.findById(
      command.conversationId,
    );
    if (!conversation)
      throw new ConversationNotFoundException(command.conversationId);

    if (!conversation.isParticipant(command.senderId)) {
      throw new NotParticipantException(command.senderId);
    }

    // Direct: chặn gửi nếu 1 trong 2 bên đã block bên kia. Unfriend vẫn được nhắn tiếp.
    if (conversation.type === 'direct') {
      const other = conversation.participants.find(
        (p) => p.userId !== command.senderId,
      );
      if (other) {
        const friendship = await this.friendshipRepository.findBetween(
          command.senderId,
          other.userId,
        );
        if (friendship?.status === FriendshipStatus.Blocked)
          throw new FriendshipBlockedException();
      }
    }

    // File validation — chốt chặn thật (không tin mỗi lớp DTO; use case có thể được gọi từ chỗ khác).
    // - Chỉ image message mới được đính fileId → combo text+fileId bị reject (lỗ hổng #1).
    // - Mọi fileId được persist đều phải tồn tại + thuộc về sender.
    // Sticker validation:
    let stickerUrl: string | undefined;
    if (command.type === 'sticker') {
      if (!command.stickerId)
        throw new InvalidMessageException('Sticker message requires stickerId');
      const stickerItem = await this.stickerRepository.findItemById(
        command.stickerId,
      );
      if (!stickerItem) throw new StickerNotFoundException(command.stickerId);
      stickerUrl = stickerItem.url;
    } else if (command.stickerId) {
      throw new StickerNotAllowedForMessageTypeException();
    }

    if (command.type === 'image') {
      if (!command.fileId) throw new FileNotFoundException();
      const file = await this.fileRepository.findById(command.fileId);
      if (!file) throw new FileNotFoundException(command.fileId);
      if (!file.isOwnedBy(command.senderId))
        throw new FileAccessDeniedException();
    } else if (command.fileId) {
      // type != 'image' mà vẫn mang fileId → không cho lọt.
      throw new FileNotAllowedForMessageTypeException();
    }

    // Nếu reply, lookup tin nhắn gốc để snapshot snippet + senderId.
    // Silent ignore nếu reply không tồn tại (tin nhắn gốc có thể đã bị xóa) — không break flow gửi.
    let replySnippet: string | undefined;
    let replySenderId: string | undefined;
    if (command.replyId) {
      const original = await this.pageRepository.findMessageById(
        command.conversationId,
        command.replyId,
      );
      if (original) {
        replySnippet = replySnippetFor(original);
        replySenderId = original.senderId;
      }
    }

    const message = MessageEntity.create({
      senderId: command.senderId,
      content: command.content,
      type: command.type,
      fileId: command.fileId,
      replyId: command.replyId,
      replySnippet,
      replySenderId,
      stickerId: command.stickerId,
      stickerUrl,
    });

    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const targetPage = await this.getOrCreateTargetPage(
        command.conversationId,
      );
      // Nếu null nghĩa là vừa va vào duplicate page → retry vòng ngoài để re-fetch list.
      if (!targetPage) continue;

      try {
        // addMessage atomic push subdoc với _id đã sinh client-side → message.id chính xác.
        // Không cần đọc lại từ updated page (cách cũ giả định "message vừa push ở cuối array" không safe khi concurrent).
        await this.pageRepository.addMessage(targetPage.id!, message);

        this.eventBus.publish(
          new MessageSentEvent(
            command.conversationId,
            command.senderId,
            message.id,
            command.content,
            targetPage.id!,
          ),
        );

        return message;
      } catch (err) {
        // Page bị fill bởi request khác xen vào giữa lúc fetch và push → retry.
        if (attempt === MAX_ATTEMPTS - 1) throw err;
      }
    }

    throw new Error(
      `Failed to send message after ${MAX_ATTEMPTS} attempts (high contention)`,
    );
  }

  // Lấy page đích (page cuối còn chỗ) hoặc tạo page mới nếu cần.
  // Trả null nếu vừa va vào DuplicatePageNumberError → caller retry vòng ngoài
  // để fetch lại danh sách pages (sẽ thấy page do request kia vừa tạo).
  private async getOrCreateTargetPage(
    conversationId: string,
  ): Promise<PageEntity | null> {
    const pages =
      await this.pageRepository.findByConversationId(conversationId);
    const lastPage = pages[pages.length - 1];

    if (pages.length > 0 && !lastPage.isFull) {
      return lastPage;
    }

    const newPage = PageEntity.create({
      conversationId,
      pageNumber: pages.length + 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });

    try {
      const saved = await this.pageRepository.save(newPage);
      this.eventBus.publish(
        new PageCreatedEvent(saved.id!, conversationId, saved.pageNumber),
      );
      return saved;
    } catch (err) {
      if (err instanceof DuplicatePageNumberError) {
        // Request khác vừa tạo page cùng pageNumber. Báo caller retry.
        return null;
      }
      throw err;
    }
  }
}
