import { GetConversationsByUserUseCase } from './get-conversation.usecase';
import { MarkConversationReadUseCase } from './mark-conversation-read.usecase';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import { ParticipantEntity } from 'src/modules/conversation/domain/participant.entity';
import { ConversationReadEvent } from 'src/modules/conversation/domain/conversation-read.event';
import { IEventBus } from 'src/shared/events/event-bus';
import { NotParticipantException } from 'src/shared/exceptions/domain-exceptions';

const ALICE = '64a1b2c3d4e5f6a7b8c9d0a1';
const BOB = '64a1b2c3d4e5f6a7b8c9d0b2';
const MALLORY = '64a1b2c3d4e5f6a7b8c9d0c3';

const conversation = (id: string, aliceLastReadAt?: Date) =>
  ConversationEntity.reconstitute({
    id,
    type: 'direct',
    createdBy: ALICE,
    settings: {
      isPrivate: false,
      allowInvites: true,
      mutedBy: [],
      pinnedBy: [],
    },
    participants: [
      ParticipantEntity.reconstitute({
        userId: ALICE,
        username: 'alice',
        role: 'admin',
        joinedAt: new Date(0),
        isActive: true,
        lastReadAt: aliceLastReadAt,
      }),
      ParticipantEntity.reconstitute({
        userId: BOB,
        username: 'bob',
        role: 'member',
        joinedAt: new Date(0),
        isActive: true,
        lastReadAt: new Date(),
      }),
    ],
  });

describe('Unread counts', () => {
  it('new participants start as fully read', () => {
    const p = ParticipantEntity.create({
      userId: ALICE,
      username: 'alice',
      role: 'member',
    });
    expect(p.lastReadAt).toBeInstanceOf(Date);
  });

  describe('GetConversationsByUserUseCase', () => {
    const readAt = new Date('2026-09-20T10:00:00Z');
    let conversationRepository: jest.Mocked<
      Pick<IConversationRepository, 'findByUserId' | 'initLastReadAt'>
    >;
    let pageRepository: jest.Mocked<
      Pick<IPageRepository, 'countUnreadByConversation' | 'getLatestMessage'>
    >;
    let useCase: GetConversationsByUserUseCase;

    beforeEach(() => {
      conversationRepository = {
        findByUserId: jest
          .fn()
          .mockResolvedValue([
            conversation('c-tracked', readAt),
            conversation('c-legacy'),
          ]),
        initLastReadAt: jest.fn().mockResolvedValue(undefined),
      };
      pageRepository = {
        countUnreadByConversation: jest
          .fn()
          .mockResolvedValue(new Map([['c-tracked', 4]])),
        getLatestMessage: jest.fn().mockResolvedValue(null),
      };
      useCase = new GetConversationsByUserUseCase(
        conversationRepository as unknown as IConversationRepository,
        pageRepository as unknown as IPageRepository,
      );
    });

    it('returns unread counts from the last-read mark', async () => {
      const result = await useCase.execute(ALICE);
      const byId = Object.fromEntries(
        result.map((r) => [r.conversation.id, r.unreadCount]),
      );
      expect(byId).toEqual({ 'c-tracked': 4, 'c-legacy': 0 });
      expect(pageRepository.countUnreadByConversation).toHaveBeenCalledWith(
        ALICE,
        [{ conversationId: 'c-tracked', since: readAt }],
      );
    });

    it('treats legacy conversations (no mark yet) as read and initialises the mark', async () => {
      await useCase.execute(ALICE);
      expect(conversationRepository.initLastReadAt).toHaveBeenCalledWith(
        ['c-legacy'],
        ALICE,
        expect.any(Date),
      );
    });
  });

  describe('MarkConversationReadUseCase', () => {
    let conversationRepository: jest.Mocked<
      Pick<IConversationRepository, 'findById' | 'markRead'>
    >;
    let eventBus: jest.Mocked<Pick<IEventBus, 'publish'>>;
    let useCase: MarkConversationReadUseCase;

    beforeEach(() => {
      conversationRepository = {
        findById: jest.fn().mockResolvedValue(conversation('c1', new Date(0))),
        markRead: jest.fn().mockResolvedValue(undefined),
      };
      eventBus = { publish: jest.fn() };
      useCase = new MarkConversationReadUseCase(
        conversationRepository as unknown as IConversationRepository,
        eventBus as unknown as IEventBus,
      );
    });

    it('moves the mark forward and notifies the user’s other devices', async () => {
      await useCase.execute({ conversationId: 'c1', userId: ALICE });
      expect(conversationRepository.markRead).toHaveBeenCalledWith(
        'c1',
        ALICE,
        expect.any(Date),
      );
      const event = eventBus.publish.mock.calls[0][0] as ConversationReadEvent;
      expect(event).toBeInstanceOf(ConversationReadEvent);
      expect(event).toMatchObject({ conversationId: 'c1', userId: ALICE });
    });

    it('rejects non-participants', async () => {
      await expect(
        useCase.execute({ conversationId: 'c1', userId: MALLORY }),
      ).rejects.toBeInstanceOf(NotParticipantException);
      expect(conversationRepository.markRead).not.toHaveBeenCalled();
    });
  });
});
