import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { FileCategory } from 'src/modules/file/domain/file.entity';
import { InvalidFileTypeException } from 'src/shared/exceptions/domain-exceptions';

export interface ProcessedImage {
  buffer: Buffer; // ảnh chính (webp)
  thumbnailBuffer: Buffer; // thumbnail (webp)
  width: number;
  height: number;
}

const MAX_DIMENSION = 1280; // ảnh thường
const AVATAR_MAX = 512; // avatar crop vuông
const THUMB_SIZE = 200;
const WEBP_QUALITY = 80;

// Wrapper sharp: validate ảnh thật + resize + convert webp + thumbnail.
// Avatar (user/conversation) được center-crop vuông; ảnh message giữ tỉ lệ.
@Injectable()
export class ImageProcessor {
  async process(
    input: Buffer,
    category: FileCategory,
  ): Promise<ProcessedImage> {
    // Validate là ảnh thật — sharp throw nếu buffer không phải ảnh hợp lệ.
    let meta: sharp.Metadata;
    try {
      meta = await sharp(input).metadata();
    } catch {
      throw new InvalidFileTypeException();
    }
    if (!meta.width || !meta.height) {
      throw new InvalidFileTypeException();
    }

    const isAvatar =
      category === 'user_avatar' || category === 'conversation_avatar';

    const mainPipeline = isAvatar
      ? sharp(input).resize(AVATAR_MAX, AVATAR_MAX, {
          fit: 'cover',
          position: 'centre',
          withoutEnlargement: true,
        })
      : sharp(input).resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        });

    const { data: buffer, info } = await mainPipeline
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const thumbnailBuffer = await sharp(input)
      .resize(THUMB_SIZE, THUMB_SIZE, {
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    return {
      buffer,
      thumbnailBuffer,
      width: info.width,
      height: info.height,
    };
  }
}
