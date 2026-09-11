import { AxiosError } from 'axios';
import apiClient from '../api/apiClient';
import { getApiErrorMessage } from '../utils/apiError';
import type {
  FriendshipDTO,
  FriendCodeResponse,
  UserSearchResultDTO,
  FriendshipRequestResult,
} from '../types/api.types';

// Map error code từ server → message tiếng Việt hiển thị cho user.
const ERROR_MESSAGES: Record<string, string> = {
  UserNotFound:             'Không tìm thấy người dùng này',
  CannotFriendSelf:         'Bạn không thể kết bạn với chính mình',
  FriendshipAlreadyExists:  'Hai bạn đã là bạn bè hoặc đang có lời mời chờ duyệt',
  FriendshipBlocked:        'Không thể gửi lời mời do một trong hai đã chặn bên kia',
  FriendshipNotFound:       'Lời mời/quan hệ không tồn tại',
  NotFriendshipRecipient:   'Chỉ người nhận lời mời mới được thực hiện thao tác này',
};

// Trích message hiển thị từ một lỗi axios (map theo error code friendship).
export const getFriendErrorMessage = (error: unknown, fallback = 'Đã có lỗi xảy ra'): string =>
  getApiErrorMessage(error, fallback, ERROR_MESSAGES);

export const friendService = {
  // ── Friend code ──
  async getMyFriendCode(): Promise<string> {
    const { data } = await apiClient.get<FriendCodeResponse>('/users/me/friend-code');
    return data.friendCode;
  },

  async regenerateFriendCode(): Promise<string> {
    const { data } = await apiClient.post<FriendCodeResponse>('/users/me/friend-code/regenerate');
    return data.friendCode;
  },

  // Preview user theo friend code (trả null nếu 404).
  async getUserByFriendCode(code: string): Promise<UserSearchResultDTO | null> {
    try {
      const { data } = await apiClient.get<UserSearchResultDTO>(
        `/users/by-friend-code/${encodeURIComponent(code)}`
      );
      return data ?? null;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) return null;
      throw error;
    }
  },

  // Tìm user theo email (trả null nếu 404).
  async searchUserByEmail(email: string): Promise<UserSearchResultDTO | null> {
    try {
      const { data } = await apiClient.get<UserSearchResultDTO>('/users/search', {
        params: { email },
      });
      return data ?? null;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) return null;
      throw error;
    }
  },

  // ── Friend requests ──
  async getIncomingRequests(): Promise<FriendshipDTO[]> {
    const { data } = await apiClient.get<FriendshipDTO[]>('/friendships/requests/incoming');
    return data;
  },

  async getOutgoingRequests(): Promise<FriendshipDTO[]> {
    const { data } = await apiClient.get<FriendshipDTO[]>('/friendships/requests/outgoing');
    return data;
  },

  async sendRequestByCode(friendCode: string): Promise<FriendshipRequestResult> {
    const { data } = await apiClient.post<FriendshipRequestResult>(
      '/friendships/requests/by-code',
      { friendCode }
    );
    return data;
  },

  async sendRequestByUserId(recipientId: string): Promise<FriendshipRequestResult> {
    const { data } = await apiClient.post<FriendshipRequestResult>('/friendships/requests', {
      recipientId,
    });
    return data;
  },

  async acceptRequest(id: string): Promise<void> {
    await apiClient.post(`/friendships/requests/${id}/accept`);
  },

  async rejectRequest(id: string): Promise<void> {
    await apiClient.post(`/friendships/requests/${id}/reject`);
  },

  // Hủy lời mời mình đã gửi (chỉ requester, status còn pending).
  async cancelRequest(id: string): Promise<void> {
    await apiClient.delete(`/friendships/requests/${id}`);
  },

  // ── Friends ──
  async getFriends(): Promise<FriendshipDTO[]> {
    const { data } = await apiClient.get<FriendshipDTO[]>('/friendships');
    return data;
  },

  async unfriend(friendUserId: string): Promise<void> {
    await apiClient.delete(`/friendships/friends/${friendUserId}`);
  },
};
