import apiClient from '../api/apiClient';
import type { StickerPackDTO } from '../types/api.types';

export const stickerService = {
  async getStickerPacks(): Promise<StickerPackDTO[]> {
    const { data } = await apiClient.get<StickerPackDTO[]>('/stickers/packs');
    return data;
  }
};
