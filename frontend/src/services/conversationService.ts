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

  // Trả về tin đã lưu (có id thật) để thay thế tin tạm "đang gửi" ở client.
  async sendMessage(payload: SendMessagePayload): Promise<MessageDTO> {
    const { data } = await apiClient.post<MessageDTO>('/conversations/messages', payload);
    return data;
  },

  // Đánh dấu đã đọc hết hội thoại (server đẩy mốc đã đọc lên thời điểm hiện tại).
  async markRead(conversationId: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/read`);
  },

  async addReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
  },

  async removeReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    await apiClient.delete(`/conversations/${conversationId}/messages/${messageId}/reactions`, { data: { emoji } });
  },
};
