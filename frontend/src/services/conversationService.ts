import apiClient from '../api/apiClient';
import type {
  ConversationDTO,
  ConversationPageInfo,
  ConversationPagesResponse,
  MessageDTO,
  SendMessagePayload,
} from '../types/api.types';

export const conversationService = {
  async getConversations(): Promise<ConversationDTO[]> {
    const { data } = await apiClient.get<ConversationDTO[]>('/conversations');
    return data;
  },

  // Lấy danh sách các trang tin nhắn của một conversation.
  async getPages(conversationId: string): Promise<ConversationPageInfo[]> {
    const { data } = await apiClient.get<ConversationPagesResponse>(
      `/conversations/${conversationId}/pages`
    );
    return data.items ?? [];
  },

  // Lấy tin nhắn của một trang cụ thể (theo pageNumber).
  async getMessagesByPage(conversationId: string, pageNumber: number): Promise<MessageDTO[]> {
    const { data } = await apiClient.get<MessageDTO[]>(
      `/conversations/messages/${conversationId}/${pageNumber}`
    );
    return data;
  },

  // Tiện ích: lấy tin nhắn của trang mới nhất (pageNumber lớn nhất).
  async getLatestMessages(conversationId: string): Promise<MessageDTO[]> {
    const pages = await this.getPages(conversationId);
    if (pages.length === 0) return [];
    const latest = pages.reduce((a, b) => (b.pageNumber > a.pageNumber ? b : a));
    return this.getMessagesByPage(conversationId, latest.pageNumber);
  },

  async sendMessage(payload: SendMessagePayload): Promise<void> {
    await apiClient.post('/conversations/messages', payload);
  },

  async addReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
  },

  async removeReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    await apiClient.delete(`/conversations/${conversationId}/messages/${messageId}/reactions`, { data: { emoji } });
  },
};
