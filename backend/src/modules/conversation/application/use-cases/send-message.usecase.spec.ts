import { SendMessageUseCase } from './send-message.usecase';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import { IStickerRepository } from 'src/modules/sticker/domain/i-sticker.repository';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { FriendshipEntity, FriendshipStatus } from 'src/modules/friendship/domain/friendship.entity';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import { PageEntity } from 'src/modules/message/domain/page.entity';
import { IEventBus } from 'src/shared/events/event-bus';
import { FriendshipBlockedException } from 'src/shared/exceptions/domain-exceptions';

const ALICE = '64a1b2c3d4e5f6a7b8c9d0a1';
const BOB = '64a1b2c3d4e5f6a7b8c9d0b2';
const CONV_ID = '64a1b2c3d4e5f6a7b8c9d0e4';

describe('SendMessageUseCase — block rules for direct conversations', () => {
  let friendshipRepository: jest.Mocked<Pick<IFriendshipRepository, 'findBetween'>>;
  let pageRepository: jest.Mocked<Pick<IPageRepository, 'findByConversationId' | 'addMessage'>>;
  let useCase: SendMessageUseCase;

  beforeEach(() => {
    const conversation = ConversationEntity.create({
      type: 'direct', createdByUserId: ALICE, participantUserIds: [BOB],
      usernames: new Map([[ALICE, 'alice'], [BOB, 'bob']]),
    });
    const page = PageEntity.reconstitute({
      id: '64a1b2c3d4e5f6a7b8c9d0f5', conversationId: CONV_ID, pageNumber: 1, pageSize: 100,
      messages: [], messageCount: 0, startTime: new Date(),
    });
    const conversationRepository = { findById: jest.fn().mockResolvedValue(conversation) };
    pageRepository = {
      findByConversationId: jest.fn().mockResolvedValue([page]),
      addMessage: jest.fn().mockResolvedValue(page),
    };
    friendshipRepository = { findBetween: jest.fn().mockResolvedValue(null) };
    useCase = new SendMessageUseCase(
      conversationRepository as unknown as IConversationRepository,
      pageRepository as unknown as IPageRepository,
      {} as IFileRepository,
      {} as IStickerRepository,
      friendshipRepository as unknown as IFriendshipRepository,
      { publish: jest.fn() } as unknown as IEventBus,
    );
  });

  const send = (senderId: string) =>
    useCase.execute({ conversationId: CONV_ID, senderId, content: 'hi' });

  it('rejects messages when either side has blocked the other', async () => {
    friendshipRepository.findBetween.mockResolvedValue(
      FriendshipEntity.reconstitute({ id: 'f', requesterId: BOB, recipientId: ALICE, status: FriendshipStatus.Blocked }),
    );
    await expect(send(ALICE)).rejects.toBeInstanceOf(FriendshipBlockedException);
    await expect(send(BOB)).rejects.toBeInstanceOf(FriendshipBlockedException);
    expect(pageRepository.addMessage).not.toHaveBeenCalled();
  });

  it('still allows messages after unfriending (no friendship record)', async () => {
    await expect(send(ALICE)).resolves.toMatchObject({ content: 'hi', senderId: ALICE });
    expect(pageRepository.addMessage).toHaveBeenCalledTimes(1);
  });
});
