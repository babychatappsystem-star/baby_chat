import { Inject, Injectable } from '@nestjs/common';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { ConversationEntity } from 'src/modules/conversation/domain/conversation.entity';
import { MessageEntity } from 'src/modules/message/domain/message.entity';
import { ConversationNotFoundException } from 'src/shared/exceptions/domain-exceptions';

// Lấy danh sách conversation mà user tham gia (theo participants.userId).
@Injectable()
export class GetConversationsByUserUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
  ) {}

  async execute(userId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.findByUserId(userId);
  }
}

// Lấy 1 conversation theo id; throw 404 nếu không tồn tại.
@Injectable()
export class GetConversationByIdUseCase {
  constructor(
    @Inject(IConversationRepository) private readonly conversationRepository: IConversationRepository,
  ) {}

  async execute(id: string): Promise<ConversationEntity> {
    const conv = await this.conversationRepository.findById(id);
    if (!conv) throw new ConversationNotFoundException(id);
    return conv;
  }
}

// Lấy mảng tin nhắn của 1 trang trong conversation. Trang đầu là 1.
@Injectable()
export class GetMessagesByPageUseCase {
  constructor(
    @Inject(IPageRepository) private readonly pageRepository: IPageRepository,
  ) {}

  async execute(conversationId: string, pageNumber: number): Promise<MessageEntity[]> {
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

  async execute(conversationId: string): Promise<PageListResult> {
    const conv = await this.conversationRepository.findById(conversationId);
    if (!conv) throw new ConversationNotFoundException(conversationId);

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
