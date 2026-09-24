import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileEntity } from 'src/modules/file/domain/file.entity';

export class FileResponseDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  id: string;

  @ApiProperty({
    enum: ['user_avatar', 'conversation_avatar', 'message_image', 'other'],
  })
  category: string;

  @ApiProperty({
    example: '/uploads/abc.webp',
    description: 'URL ảnh chính (relative)',
  })
  url: string;

  @ApiPropertyOptional({ example: '/uploads/thumb_abc.webp' })
  thumbnailUrl?: string;

  @ApiProperty({ example: 'image/webp' })
  mimetype: string;

  @ApiProperty({ example: 45210, description: 'Dung lượng (bytes) sau nén' })
  size: number;

  @ApiProperty({ example: 1280 })
  width: number;

  @ApiProperty({ example: 720 })
  height: number;

  @ApiPropertyOptional({ example: '2026-06-04T10:00:00.000Z' })
  createdAt?: Date;

  static fromEntity(entity: FileEntity): FileResponseDto {
    return {
      id: entity.id!,
      category: entity.category,
      url: entity.url,
      thumbnailUrl: entity.thumbnailUrl,
      mimetype: entity.mimetype,
      size: entity.size,
      width: entity.width,
      height: entity.height,
      createdAt: entity.createdAt,
    };
  }
}
