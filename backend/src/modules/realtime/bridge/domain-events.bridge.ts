import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { MessageSentEvent } from 'src/modules/message/domain/message-sent.event';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { ConversationCreatedEvent } from 'src/modules/conversation/domain/conversation-created.event';
import { ConversationDeletedEvent } from 'src/modules/conversation/domain/conversation-deleted.event';
import { FriendRequestSentEvent } from 'src/modules/friendship/domain/friend-request-sent.event';
import { FriendshipAcceptedEvent } from 'src/modules/friendship/domain/friendship-accepted.event';
import { ReactionUpdatedEvent } from 'src/modules/message/domain/reaction-updated.event';
import { FileUrlResolver } from 'src/modules/file/application/file-url-resolver.service';
import { ChatGateway } from '../gateway/chat.gateway';

// Bridge: subscribe các domain event (publish bởi REST use cases) → emit WS qua gateway.
// Domain modules không cần biết WS tồn tại — pattern observer thuần.
@Injectable()
export class DomainEventsBridge {
  private readonly logger = new Logger(DomainEventsBridge.name);

  constructor(
    private readonly gateway: ChatGateway,
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IPageRepository) private readonly pageRepository: IPageRepository,
    private readonly fileUrlResolver: FileUrlResolver,
  ) {}

  // Tin nhắn mới: emit cho mọi participant trừ sender.
  // Cần lookup message để lấy reply snapshot + type/fileUrl + createdAt — event chỉ có id/content.
  @OnEvent('message.sent')
  async onMessageSent(event: MessageSentEvent): Promise<void> {
    try {
      const fullMessage = await this.pageRepository.findMessageById(
        event.conversationId,
        event.messageId,
      );
      // Chỉ resolve fileUrl cho image message (phòng data cũ/lỗi có fileId trên text message — lỗ hổng #1).
      const fileUrl =
        fullMessage?.type === 'image' && fullMessage.fileId
          ? (await this.fileUrlResolver.resolve(fullMessage.fileId))?.url
          : null;

      this.gateway.emitMessageNew(event.conversationId, event.senderId, {
        conversationId: event.conversationId,
        messageId: event.messageId,
        senderId: event.senderId,
        content: event.content,
        type: fullMessage?.type ?? 'text',
        fileUrl,
        stickerUrl: fullMessage?.stickerUrl,
        replyId: fullMessage?.replyId,
        replySnippet: fullMessage?.replySnippet,
        replySenderId: fullMessage?.replySenderId,
        createdAt: (fullMessage?.createdAt ?? new Date()).toISOString(),
      });
    } catch (err) {
      this.logger.error(
        `Failed to broadcast message.new for ${event.messageId}`,
        err,
      );
    }
  }

  // Lời mời kết bạn mới: notify recipient.
  @OnEvent('friendship.request_sent')
  async onFriendRequestSent(event: FriendRequestSentEvent): Promise<void> {
    try {
      const requester = await this.userRepository.findById(event.requesterId);
      this.gateway.emitFriendshipRequestReceived(event.recipientId, {
        friendshipId: event.friendshipId,
        requesterId: event.requesterId,
        requesterUsername: requester?.username ?? '',
      });
    } catch (err) {
      this.logger.error(
        `Failed to broadcast friendship.request_received for ${event.friendshipId}`,
        err,
      );
    }
  }

  // Lời mời được chấp nhận: notify requester.
  @OnEvent('friendship.accepted')
  async onFriendshipAccepted(event: FriendshipAcceptedEvent): Promise<void> {
    try {
      const recipient = await this.userRepository.findById(event.recipientId);
      this.gateway.emitFriendshipAccepted(event.requesterId, {
        friendshipId: event.friendshipId,
        recipientId: event.recipientId,
        recipientUsername: recipient?.username ?? '',
      });
    } catch (err) {
      this.logger.error(
        `Failed to broadcast friendship.accepted for ${event.friendshipId}`,
        err,
      );
    }
  }

  // Conversation mới: notify tất cả participant + auto-join họ vào conv room.
  @OnEvent('conversation.created')
  async onConversationCreated(event: ConversationCreatedEvent): Promise<void> {
    try {
      const conv = await this.conversationRepository.findById(
        event.conversationId,
      );
      if (!conv) return;

      const participants = conv.participants.map((p) => ({
        userId: p.userId,
        username: p.username,
      }));

      await this.gateway.emitConversationCreated(
        conv.participants.map((p) => p.userId),
        {
          conversationId: event.conversationId,
          type: event.type,
          participants,
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to broadcast conversation.created for ${event.conversationId}`,
        err,
      );
    }
  }

  @OnEvent('conversation.deleted')
  onConversationDeleted(event: ConversationDeletedEvent): void {
    this.gateway.removeConversationRoom(event.conversationId);
  }

  @OnEvent('reaction.updated')
  onReactionUpdated(event: ReactionUpdatedEvent): void {
    try {
      this.gateway.emitReactionUpdated(event.conversationId, {
        messageId: event.messageId,
        conversationId: event.conversationId,
        userId: event.userId,
        emoji: event.emoji,
        action: event.action,
      });
    } catch (err) {
      this.logger.error(
        `Failed to broadcast reaction.updated for message ${event.messageId}`,
        err,
      );
    }
  }
}
