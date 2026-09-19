export class StickerItemDto {
  id: string;
  url: string;
}

export class StickerPackDto {
  id: string;
  name: string;
  thumbnailUrl: string;
  items: StickerItemDto[];
}
