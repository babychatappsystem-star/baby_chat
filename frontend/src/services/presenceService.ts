import apiClient from '../api/apiClient';

export interface FriendPresenceDto {
  userId: string;
  online: boolean;
  lastSeenAt?: string;
}

export const getMyFriendsPresence = async (): Promise<FriendPresenceDto[]> => {
  const response = await apiClient.get('/users/me/friends/presence');
  return response.data;
};

export const updatePresenceSettings = async (
  hidePresence: boolean
): Promise<{ hidePresence: boolean }> => {
  const response = await apiClient.patch('/users/me/presence', { hidePresence });
  return response.data;
};
