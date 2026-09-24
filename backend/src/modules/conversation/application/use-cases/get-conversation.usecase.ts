import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import { MessageEntity } from 'src/modules/message/domain/message.entity';
import {
  ConversationNotFoundException,
  NotParticipantException,
} from 'src/shared/exceptions/domain-exceptions';

// Tải conversation và bảo đảm userId là participant. Dùng chung cho mọi use case đọc.
async function loadConversationForParticipant(
  conversationRepository: IConversationRepository,
  conversationId: string,
  userId: string,
): Promise<ConversationEntity> {
  const conv = await conversationRepository.findById(conversationId);
  if (!conv) throw new ConversationNotFoundException(conversationId);
  if (!conv.isParticipant(userId)) throw new NotParticipantException(userId);
  return conv;
}

// Lấy danh sách conversation mà user tham gia (theo participants.userId).
@Injectable()
export class GetConversationsByUserUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
    @Inject(IPageRepository) private readonly pageRepository: IPageRepository,
  ) {}

  async execute(userId: string): Promise<Array<{ conversation: ConversationEntity; lastMessage: MessageEntity | null }>> {
    const convs = await this.conversationRepository.findByUserId(userId);
    const result = await Promise.all(
      convs.map(async (conv) => {
        const lastMessage = await this.pageRepository.getLatestMessage(conv.id!);
        return { conversation: conv, lastMessage };
      })
    );

    result.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt?.getTime() ?? a.conversation.updatedAt?.getTime() ?? 0;
      const timeB = b.lastMessage?.createdAt?.getTime() ?? b.conversation.updatedAt?.getTime() ?? 0;
      return timeB - timeA;
    });

    return result;
  }
}

// Lấy 1 conversation theo id; 404 nếu không tồn tại, 403 nếu không phải participant.
@Injectable()
export class GetConversationByIdUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
  ) {}

  execute(id: string, userId: string): Promise<ConversationEntity> {
    return loadConversationForParticipant(this.conversationRepository, id, userId);
  }
}

// Lấy mảng tin nhắn của 1 trang trong conversation. Trang đầu là 1.
@Injectable()
export class GetMessagesByPageUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
    @Inject(IPageRepository) private readonly pageRepository: IPageRepository,
  ) {}

  async execute(conversationId: string, pageNumber: number, userId: string): Promise<MessageEntity[]> {
    await loadConversationForParticipant(this.conversationRepository, conversationId, userId);
    return this.pageRepository.getMessagesByPageNumber(conversationId, pageNumber);
  }
}

export interface PageListResult {
  totalPages: number;
  limit: number;
  items: Array<{ pageNumber: number; pageId: string; messageCount: number }>;
}

// Lấy metadata về danh sách trang của conversation. Trả pageNumber + pageId song song
// để FE biết dùng cái nào — pageNumber gọi /messages/:conversationId/:pageNum, pageId
// dùng cho operation cần ID document.
@Injectable()
export class GetPageListUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
    @Inject(IPageRepository) private readonly pageRepository: IPageRepository,
  ) {}

  async execute(conversationId: string, userId: string): Promise<PageListResult> {
    await loadConversationForParticipant(this.conversationRepository, conversationId, userId);

    const pages = await this.pageRepository.findByConversationId(conversationId);
    // pages từ DB không bảo đảm order — sort theo pageNumber tăng dần.
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    const limit = pages[0]?.pageSize ?? 0;
    return {
      totalPages: pages.length,
      limit,
      items: pages.map((p) => ({
        pageNumber: p.pageNumber,
        pageId: p.id!,
        messageCount: p.messageCount,
      })),
    };
  }
}
