import {
  GetConversationByIdUseCase,
  GetMessagesByPageUseCase,
  GetPageListUseCase,
} from './get-conversation.usecase';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import {
  ConversationNotFoundException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';

const ALICE = '64a1b2c3d4e5f6a7b8c9d0a1';
const BOB = '64a1b2c3d4e5f6a7b8c9d0b2';
const MALLORY = '64a1b2c3d4e5f6a7b8c9d0c3';
const CONV_ID = '64a1b2c3d4e5f6a7b8c9d0e4';

describe('Conversation read use cases — participant check', () => {
  let conversationRepository: jest.Mocked<
    Pick<IConversationRepository, 'findById'>
  >;
  let pageRepository: jest.Mocked<
    Pick<IPageRepository, 'getMessagesByPageNumber' | 'findByConversationId'>
  >;

  beforeEach(() => {
    const conversation = ConversationEntity.create({
      type: 'direct',
      createdByUserId: ALICE,
      participantUserIds: [BOB],
      usernames: new Map([
        [ALICE, 'alice'],
        [BOB, 'bob'],
      ]),
    });
    conversationRepository = {
      findById: jest.fn().mockResolvedValue(conversation),
    };
    pageRepository = {
      getMessagesByPageNumber: jest.fn().mockResolvedValue([]),
      findByConversationId: jest.fn().mockResolvedValue([]),
    };
  });

  const build = () => ({
    getById: new GetConversationByIdUseCase(
      conversationRepository as unknown as IConversationRepository,
    ),
    getMessages: new GetMessagesByPageUseCase(
      conversationRepository as unknown as IConversationRepository,
      pageRepository as unknown as IPageRepository,
    ),
    getPages: new GetPageListUseCase(
      conversationRepository as unknown as IConversationRepository,
      pageRepository as unknown as IPageRepository,
    ),
  });

  it('allows participants to read', async () => {
    const { getById, getMessages, getPages } = build();
    await expect(getById.execute(CONV_ID, BOB)).resolves.toBeInstanceOf(
      ConversationEntity,
    );
    await expect(getMessages.execute(CONV_ID, 1, ALICE)).resolves.toEqual([]);
    await expect(getPages.execute(CONV_ID, ALICE)).resolves.toMatchObject({
      totalPages: 0,
    });
  });

  it('rejects non-participants with 403 and never touches messages', async () => {
    const { getById, getMessages, getPages } = build();
    await expect(getById.execute(CONV_ID, MALLORY)).rejects.toBeInstanceOf(
      NotParticipantException,
    );
    await expect(
      getMessages.execute(CONV_ID, 1, MALLORY),
    ).rejects.toBeInstanceOf(NotParticipantException);
    await expect(getPages.execute(CONV_ID, MALLORY)).rejects.toBeInstanceOf(
      NotParticipantException,
    );
    expect(pageRepository.getMessagesByPageNumber).not.toHaveBeenCalled();
    expect(pageRepository.findByConversationId).not.toHaveBeenCalled();
  });

  it('returns 404 when the conversation does not exist', async () => {
    conversationRepository.findById.mockResolvedValue(null);
    const { getMessages } = build();
    await expect(getMessages.execute(CONV_ID, 1, ALICE)).rejects.toBeInstanceOf(
      ConversationNotFoundException,
    );
  });
});
