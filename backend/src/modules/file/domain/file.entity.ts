export type FileCategory =
  | 'user_avatar'
  | 'conversation_avatar'
  | 'message_image'
  | 'other';

export const FILE_CATEGORIES: FileCategory[] = [
  'user_avatar',
  'conversation_avatar',
  'message_image',
  'other',
];

export interface CreateFileProps {
  ownerId: string;
  category: FileCategory;
  originalName: string;
  mimetype: string;
  size: number;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
}

// Metadata 1 file đã upload. File vật lý nằm ở storage (local disk / cloud);
// entity này chỉ giữ thông tin để tham chiếu + serve URL.
export class FileEntity {
  readonly id?: string;
  readonly ownerId: string;
  readonly category: FileCategory;
  readonly originalName: string;
  readonly mimetype: string;
  readonly size: number;
  readonly filename: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly width: number;
  readonly height: number;
  readonly createdAt?: Date;

  private constructor(props: {
    id?: string;
    ownerId: string;
    category: FileCategory;
    originalName: string;
    mimetype: string;
    size: number;
    filename: string;
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    createdAt?: Date;
  }) {
    this.id = props.id;
    this.ownerId = props.ownerId;
    this.category = props.category;
    this.originalName = props.originalName;
    this.mimetype = props.mimetype;
    this.size = props.size;
    this.filename = props.filename;
    this.url = props.url;
    this.thumbnailUrl = props.thumbnailUrl;
    this.width = props.width;
    this.height = props.height;
    this.createdAt = props.createdAt;
  }

  static create(props: CreateFileProps): FileEntity {
    if (!props.ownerId) throw new Error('ownerId is required');
    if (!props.filename) throw new Error('filename is required');
    return new FileEntity(props);
  }

  static reconstitute(props: {
    id: string;
    ownerId: string;
    category: FileCategory;
    originalName: string;
    mimetype: string;
    size: number;
    filename: string;
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    createdAt?: Date;
  }): FileEntity {
    return new FileEntity(props);
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }
}
