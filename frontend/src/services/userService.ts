import apiClient from '../api/apiClient';
import type { ProfileDTO } from '../types/api.types';

export const updateExpressiveChatSettings = async (
  thresholds: number,
  transitionTime: number,
  emojis?: string[]
): Promise<Partial<ProfileDTO>> => {
  const response = await apiClient.patch('/users/me/expressive-chat', { thresholds, transitionTime, emojis });
  return response.data;
};
