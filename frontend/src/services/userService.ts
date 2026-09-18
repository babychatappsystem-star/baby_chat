import apiClient from '../api/apiClient';
import type { ProfileDTO } from '../types/api.types';

export const updateExpressiveChatSettings = async (
  thresholds: number,
  transitionTime: number
): Promise<Partial<ProfileDTO>> => {
  const response = await apiClient.patch('/users/me/expressive-chat', { thresholds, transitionTime });
  return response.data;
};
