import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import { IStorageProvider } from 'src/modules/file/domain/i-storage.provider';
import { FileCategory, FileEntity } from 'src/modules/file/domain/file.entity';
import { ImageProcessor } from 'src/modules/file/infrastructure/image-processor';

export interface UploadImageCommand {
  ownerId: string;
  category: FileCategory;
  originalName: string;
  buffer: Buffer;
}

// Flow: validate + process ảnh (sharp) → lưu main + thumbnail vào storage →
// persist metadata. Filename là uuid (không dùng tên client, chống path traversal).
@Injectable()
export class UploadImageUseCase {
  constructor(
    @Inject(IFileRepository) private readonly fileRepository: IFileRepository,
    @Inject(IStorageProvider) private readonly storage: IStorageProvider,
    private readonly imageProcessor: ImageProcessor,
  ) {}

  async execute(cmd: UploadImageCommand): Promise<FileEntity> {
    const processed = await this.imageProcessor.process(cmd.buffer, cmd.category);

    const id = randomUUID();
    const filename = `${id}.webp`;
    const thumbFilename = `thumb_${id}.webp`;

    const [main, thumb] = await Promise.all([
      this.storage.save(processed.buffer, filename),
      this.storage.save(processed.thumbnailBuffer, thumbFilename),
    ]);

    const file = FileEntity.create({
      ownerId: cmd.ownerId,
      category: cmd.category,
      originalName: cmd.originalName,
      mimetype: 'image/webp',
      size: processed.buffer.length,
      filename,
      url: main.url,
      thumbnailUrl: thumb.url,
      width: processed.width,
      height: processed.height,
    });

    return this.fileRepository.save(file);
  }
}
