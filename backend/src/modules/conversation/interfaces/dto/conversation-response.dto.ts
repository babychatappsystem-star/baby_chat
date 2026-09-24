import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MessageType } from 'src/modules/message/domain/message.entity';

// Một participant trong conversation, đã loại field nội bộ.
export class ParticipantResponseDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  userId: string;

  @ApiProperty({
    example: 'johndoe',
    description:
      'Nickname trong conversation này (snapshot từ User.username lúc join, có thể user tự đổi)',
  })
  username: string;

  @ApiProperty({ enum: ['admin', 'member', 'moderator'], example: 'member' })
  role: string;

  @ApiProperty({ example: '2026-05-23T10:00:00.000Z' })
  joinedAt: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  leftAt?: Date;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({
    example: '/uploads/avatar.webp',
    description: 'URL avatar của user',
  })
  avatarUrl?: string | null;
}

// Settings của conversation.
export class ConvSettingsResponseDto {
  @ApiProperty({ example: false })
  isPrivate: boolean;

  @ApiProperty({ example: true })
  allowInvites: boolean;

  @ApiProperty({ type: [String], example: [] })
  mutedBy: string[];

  @ApiProperty({ type: [String], example: [] })
  pinnedBy: string[];
}

// Một entry trong danh sách page, đủ thông tin để FE gọi tiếp /messages.
export class PageRefItemDto {
  @ApiProperty({
    example: 1,
    description:
      'Số trang (1-based), dùng cho /messages/:conversationId/:pageNum',
  })
  pageNumber: number;

  @ApiProperty({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ObjectId của Page document',
  })
  pageId: string;

  @ApiProperty({ example: 50, description: 'Số tin nhắn hiện có trong page' })
  messageCount: number;
}

// Metadata về danh sách trang của conversation.
export class PageRefResponseDto {
  @ApiProperty({ example: 3, description: 'Tổng số trang hiện có' })
  totalPages: number;

  @ApiProperty({ example: 100, description: 'Số tin nhắn tối đa mỗi trang' })
  limit: number;

  @ApiProperty({
    type: [PageRefItemDto],
    description: 'Danh sách page, sort theo pageNumber tăng dần',
  })
  items: PageRefItemDto[];
}

// Conversation đầy đủ, trả về cho client.
export class ConversationResponseDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  id: string;

  @ApiProperty({ enum: ['direct', 'group', 'channel'], example: 'group' })
  type: string;

  @ApiPropertyOptional({ example: 'My Group' })
  name?: string;

  @ApiPropertyOptional({ example: 'Group description' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  avatar?: string;

  @ApiPropertyOptional({
    example: '/uploads/abc.webp',
    description: 'URL avatar resolve từ avatarFileId',
  })
  avatarUrl?: string | null;

  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e2' })
  createdBy: string;

  @ApiProperty({ type: [ParticipantResponseDto] })
  participants: ParticipantResponseDto[];

  @ApiProperty({ type: ConvSettingsResponseDto })
  settings: ConvSettingsResponseDto;

  @ApiPropertyOptional({ example: '2026-05-23T10:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-05-23T10:00:00.000Z' })
  updatedAt?: Date;

  @ApiPropertyOptional({ example: 'Hello there' })
  lastMessage?: string;

  @ApiPropertyOptional({ enum: ['text', 'image', 'sticker'], example: 'text' })
  lastMessageType?: MessageType;

  @ApiPropertyOptional({ example: '2026-05-23T10:00:00.000Z' })
  lastMessageAt?: Date;
}

// Một message trong conversation, trả về cho client.
export class MessageResponseDto {
  @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e3' })
  id?: string;

  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e2' })
  senderId: string;

  @ApiProperty({
    example: 'Hello!',
    description: 'Có thể rỗng nếu là image message',
  })
  content: string;

  @ApiProperty({ enum: ['text', 'image', 'sticker'], example: 'text' })
  type: string;

  @ApiPropertyOptional({
    example: '/uploads/abc.webp',
    description: 'URL ảnh khi type=image (resolve từ fileId)',
  })
  fileUrl?: string | null;

  @ApiPropertyOptional({
    example: 'https://...',
    description: 'URL sticker khi type=sticker',
  })
  stickerUrl?: string | null;

  @ApiPropertyOptional({
    example: '6aafa6215ef6eab1b18355bc',
    description: 'ID sticker khi type=sticker',
  })
  stickerId?: string | null;

  @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e4', nullable: true })
  replyId?: string;

  @ApiPropertyOptional({
    example: 'Tin nhắn gốc...',
    description: 'Snapshot nội dung tin được reply (max 80 ký tự)',
  })
  replySnippet?: string;

  @ApiPropertyOptional({
    example: '64a1b2c3d4e5f6a7b8c9d0e5',
    description: 'senderId của tin nhắn được reply',
  })
  replySenderId?: string;

  @ApiProperty({ example: '2026-05-23T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-23T10:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({
    example: [{ userId: '64a1b2c3d4e5f6a7b8c9d0e2', emoji: '👍' }],
    description: 'Danh sách reactions của tin nhắn',
  })
  reactions?: { userId: string; emoji: string }[];
}
