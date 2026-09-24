import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as webpush from 'web-push';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { PresenceService } from 'src/modules/realtime/presence/presence.service';
import { MessageSentEvent } from 'src/modules/message/domain/message-sent.event';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
    private readonly presenceService: PresenceService,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT');

    if (!publicKey || !privateKey || !subject) {
      this.logger.warn(
        'VAPID keys not fully configured. Web Push will be disabled.',
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('Web Push initialized with VAPID keys.');
  }

  @OnEvent('message.sent')
  async handleMessageSentEvent(event: MessageSentEvent) {
    try {
      const conversation = await this.conversationRepository.findById(
        event.conversationId,
      );
      if (!conversation) return;

      const sender = await this.userRepository.findById(event.senderId);
      const senderName = sender?.displayName || sender?.username || 'Someone';

      const payload = JSON.stringify({
        title: 'BabyChat',
        // Ảnh/sticker không có content → câu chung thay vì "Name: " rỗng.
        body: event.content
          ? `${senderName}: ${event.content}`
          : `${senderName} sent a message`,
        url: `/messages?c=${event.conversationId}`,
      });

      for (const participant of conversation.participants) {
        const participantId = participant.userId;
        // Skip sending push to the sender
        if (participantId === event.senderId) continue;
        // Đang mở app ở tab được focus → tin đã hiện realtime, không push.
        if (this.presenceService.isFocused(participantId)) continue;

        // Tìm push subscriptions của user
        const user = await this.userRepository.findById(participantId);
        if (
          !user ||
          !user.pushSubscriptions ||
          user.pushSubscriptions.length === 0
        )
          continue;

        for (const sub of user.pushSubscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
            this.logger.log(
              `Successfully sent Web Push to user ${participantId}`,
            );
          } catch (error: any) {
            if (error.statusCode === 404 || error.statusCode === 410) {
              this.logger.debug(
                `Subscription expired or removed for user ${participantId}. Lazy cleanup.`,
              );
              await this.userRepository.removePushSubscription(
                participantId,
                sub.endpoint,
              );
            } else {
              this.logger.error(
                `Error sending push notification to user ${participantId}`,
                error,
              );
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        'Error handling message.sent for push notifications',
        error,
      );
    }
  }
}
