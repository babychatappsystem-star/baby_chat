import { StickerItem, StickerPack } from './sticker-pack.entity';

export const IStickerRepository = Symbol('IStickerRepository');

export interface IStickerRepository {
  getActivePacks(): Promise<StickerPack[]>;
  findItemById(stickerId: string): Promise<StickerItem | null>;
}
