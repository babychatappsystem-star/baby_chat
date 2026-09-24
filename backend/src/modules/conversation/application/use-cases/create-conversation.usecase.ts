import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import {
  ConversationEntity,
  ConversationType,
  ConversationSettings,
} from 'src/modules/conversation/domain/conversation.entity';
import {
  FriendshipBlockedException,
  NotFriendsException,
  UserNotFoundException,
} from 'src/shared/exceptions/domain-exceptions';
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

// Use case tạo conversation:
// 1. Mọi participant phải tồn tại và là bạn (accepted) của creator; bị chặn → 403.
// 2. Direct: nếu 2 người đã có direct conversation thì trả lại cái cũ (idempotent).
// 3. Lưu DB → publish ConversationCreatedEvent.
@Injectable()
export class CreateConversationUseCase {
  constructor(
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IFriendshipRepository)
    private readonly friendshipRepository: IFriendshipRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(
    command: CreateConversationCommand,
  ): Promise<ConversationEntity> {
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
    for (const uid of allUserIds) {
      if (!usernames.has(uid)) throw new UserNotFoundException(uid);
    }

    const otherUserIds = allUserIds.filter(
      (uid) => uid !== command.createdByUserId,
    );
    await this.assertFriendsWithCreator(command.createdByUserId, otherUserIds);

    if (command.type === 'direct' && otherUserIds.length === 1) {
      const existing = await this.findDirectConversation(
        command.createdByUserId,
        otherUserIds[0],
      );
      if (existing) return existing;
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

  private async assertFriendsWithCreator(
    creatorId: string,
    otherUserIds: string[],
  ): Promise<void> {
    for (const uid of otherUserIds) {
      const friendship = await this.friendshipRepository.findBetween(
        creatorId,
        uid,
      );
      if (friendship?.status === FriendshipStatus.Blocked)
        throw new FriendshipBlockedException();
      if (friendship?.status !== FriendshipStatus.Accepted)
        throw new NotFriendsException(uid);
    }
  }

  private async findDirectConversation(
    userA: string,
    userB: string,
  ): Promise<ConversationEntity | null> {
    const conversations = await this.conversationRepository.findByUserId(userA);
    return (
      conversations.find(
        (c) =>
          c.type === 'direct' &&
          c.participants.length === 2 &&
          c.isParticipant(userA) &&
          c.isParticipant(userB),
      ) ?? null
    );
  }
}
