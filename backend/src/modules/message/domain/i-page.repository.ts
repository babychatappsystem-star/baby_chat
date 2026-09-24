import { PageEntity } from './page.entity';
import { MessageEntity } from './message.entity';

export abstract class IPageRepository {
  abstract findById(id: string): Promise<PageEntity | null>;
  abstract findByConversationId(conversationId: string): Promise<PageEntity[]>;
  abstract findByConversationIdAndPageNumber(
    conversationId: string,
    pageNumber: number,
  ): Promise<PageEntity | null>;
  abstract save(page: PageEntity): Promise<PageEntity>;
  abstract addMessage(
    pageId: string,
    message: MessageEntity,
  ): Promise<PageEntity>;
  abstract getMessagesByPageNumber(
    conversationId: string,
    pageNumber: number,
  ): Promise<MessageEntity[]>;
  // Tìm 1 message subdoc theo (conversationId, messageId). Dùng cho lookup reply.
  abstract findMessageById(
    conversationId: string,
    messageId: string,
  ): Promise<MessageEntity | null>;
  abstract updateMessageReactions(
    conversationId: string,
    messageId: string,
    reactions: { userId: string; emoji: string }[],
  ): Promise<void>;
  // Số tin người khác gửi sau mốc `since` của từng hội thoại. Hội thoại không có tin
  // chưa đọc sẽ không có trong Map.
  abstract countUnreadByConversation(
    userId: string,
    since: Array<{ conversationId: string; since: Date }>,
  ): Promise<Map<string, number>>;
  abstract getLatestMessage(
    conversationId: string,
  ): Promise<MessageEntity | null>;
}

export const PAGE_REPOSITORY = IPageRepository;
