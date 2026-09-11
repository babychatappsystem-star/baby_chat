import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { ConversationEntity, ConversationType, ConversationSettings } from 'src/modules/conversation/domain/conversation.entity';
import { UserNotFoundException } from 'src/shared/exceptions/domain-exceptions';
import { IEventBus, EVENT_BUS } from 'src/shared/events/event-bus';
import { ConversationCreatedEvent } from 'src/modules/conversation/domain/conversation-created.event';

export interface CreateConversationCommand {
  type: ConversationType;
  createdByUserId: string;
  participantUserIds: string[];
  name?: string;
  description?: string;
  avatar?: string;
  settings?: Partial<ConversationSettings>;
}

// Use case tạo conversation: validate tất cả participant tồn tại → tạo entity →
// lưu DB → publish ConversationCreatedEvent (để gửi notification, sync ngoại biên...).
@Injectable()
export class CreateConversationUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(command: CreateConversationCommand): Promise<ConversationEntity> {
    // Tập user cần lookup = participants + creator. Dùng Set để dedupe nếu creator
    // cũng nằm trong participantUserIds (ConversationEntity.create sẽ tự dedupe sau).
    const allUserIds = Array.from(
      new Set([command.createdByUserId, ...command.participantUserIds]),
    );

    const users = await this.userRepository.findByIds(allUserIds);
    const usernames = new Map<string, string>();
    for (const user of users) {
      if (user.id) usernames.set(user.id, user.username);
    }
    // User nào không tìm thấy → throw 404 (lần đầu thiếu).
    for (const uid of allUserIds) {
      if (!usernames.has(uid)) throw new UserNotFoundException(uid);
    }

    const conversation = ConversationEntity.create({
      type: command.type,
      createdByUserId: command.createdByUserId,
      participantUserIds: command.participantUserIds,
      usernames,
      name: command.name,
      description: command.description,
      avatar: command.avatar,
      settings: command.settings,
    });

    const saved = await this.conversationRepository.save(conversation);

    this.eventBus.publish(
      new ConversationCreatedEvent(
        saved.id ?? saved.createdBy,
        saved.type,
        command.createdByUserId,
        command.participantUserIds,
      ),
    );

    return saved;
  }
}
