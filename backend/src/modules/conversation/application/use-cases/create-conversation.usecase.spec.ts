import { CreateConversationUseCase } from './create-conversation.usecase';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipEntity, FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import { IEventBus } from 'src/shared/events/event-bus';
import {
  FriendshipBlockedException,
  NotFriendsException,
  UserNotFoundException,
} from 'src/shared/exceptions/domain-exceptions';

const ALICE = '64a1b2c3d4e5f6a7b8c9d0a1';
const BOB = '64a1b2c3d4e5f6a7b8c9d0b2';
const CAROL = '64a1b2c3d4e5f6a7b8c9d0c3';

const friendship = (a: string, b: string, status: FriendshipStatus) =>
  FriendshipEntity.reconstitute({ id: `${a}-${b}`, requesterId: a, recipientId: b, status });

describe('CreateConversationUseCase', () => {
  let conversationRepository: jest.Mocked<Pick<IConversationRepository, 'findByUserId' | 'save'>>;
  let userRepository: jest.Mocked<Pick<IUserRepository, 'findByIds'>>;
  let friendshipRepository: jest.Mocked<Pick<IFriendshipRepository, 'findBetween'>>;
  let eventBus: jest.Mocked<Pick<IEventBus, 'publish'>>;
  let useCase: CreateConversationUseCase;
  let relations: Record<string, FriendshipStatus>;

  beforeEach(() => {
    relations = { [BOB]: FriendshipStatus.Accepted, [CAROL]: FriendshipStatus.Accepted };
    conversationRepository = {
      findByUserId: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (c: ConversationEntity) => c),
    };
    userRepository = {
      findByIds: jest.fn().mockImplementation(async (ids: string[]) =>
        ids.map((id) => ({ id, username: `user-${id.slice(-2)}` })),
      ),
    };
    friendshipRepository = {
      findBetween: jest.fn().mockImplementation(async (_a: string, b: string) =>
        relations[b] ? friendship(ALICE, b, relations[b]) : null,
      ),
    };
    eventBus = { publish: jest.fn() };
    useCase = new CreateConversationUseCase(
      conversationRepository as unknown as IConversationRepository,
      userRepository as unknown as IUserRepository,
      friendshipRepository as unknown as IFriendshipRepository,
      eventBus as unknown as IEventBus,
    );
  });

  it('creates a group with friends and publishes the event', async () => {
    const conv = await useCase.execute({
      type: 'group', name: 'G', createdByUserId: ALICE, participantUserIds: [BOB, CAROL],
    });
    expect(conv.participants).toHaveLength(3);
    expect(conversationRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('rejects participants who are not friends', async () => {
    delete relations[CAROL];
    await expect(
      useCase.execute({ type: 'group', name: 'G', createdByUserId: ALICE, participantUserIds: [BOB, CAROL] }),
    ).rejects.toBeInstanceOf(NotFriendsException);
    relations[CAROL] = FriendshipStatus.Pending;
    await expect(
      useCase.execute({ type: 'group', name: 'G', createdByUserId: ALICE, participantUserIds: [CAROL] }),
    ).rejects.toBeInstanceOf(NotFriendsException);
    expect(conversationRepository.save).not.toHaveBeenCalled();
  });

  it('rejects blocked users', async () => {
    relations[BOB] = FriendshipStatus.Blocked;
    await expect(
      useCase.execute({ type: 'direct', createdByUserId: ALICE, participantUserIds: [BOB] }),
    ).rejects.toBeInstanceOf(FriendshipBlockedException);
  });

  it('rejects unknown users', async () => {
    userRepository.findByIds.mockResolvedValue([{ id: ALICE, username: 'alice' }] as never);
    await expect(
      useCase.execute({ type: 'direct', createdByUserId: ALICE, participantUserIds: [BOB] }),
    ).rejects.toBeInstanceOf(UserNotFoundException);
  });

  it('returns the existing direct conversation instead of creating a duplicate', async () => {
    const existing = ConversationEntity.create({
      type: 'direct', createdByUserId: BOB, participantUserIds: [ALICE],
      usernames: new Map([[ALICE, 'alice'], [BOB, 'bob']]),
    });
    conversationRepository.findByUserId.mockResolvedValue([existing]);
    const conv = await useCase.execute({ type: 'direct', createdByUserId: ALICE, participantUserIds: [BOB] });
    expect(conv).toBe(existing);
    expect(conversationRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
