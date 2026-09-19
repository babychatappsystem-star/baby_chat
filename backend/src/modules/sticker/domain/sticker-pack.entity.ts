export class StickerItem {
  constructor(
    public readonly id: string,
    public readonly url: string,
  ) {}
}

export interface CreateStickerPackProps {
  id?: string;
  name: string;
  thumbnailUrl: string;
  isActive: boolean;
  items: StickerItem[];
}

export class StickerPack {
  public readonly id: string;
  public readonly name: string;
  public readonly thumbnailUrl: string;
  public readonly isActive: boolean;
  public readonly items: StickerItem[];

  constructor(props: CreateStickerPackProps) {
    this.id = props.id || '';
    this.name = props.name;
    this.thumbnailUrl = props.thumbnailUrl;
    this.isActive = props.isActive;
    this.items = props.items;
  }
}
