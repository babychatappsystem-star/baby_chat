import { Inject, Injectable } from '@nestjs/common';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import { IStorageProvider } from 'src/modules/file/domain/i-storage.provider';
import {
  FileAccessDeniedException,
  FileNotFoundException,
} from 'src/shared/exceptions/domain-exceptions';

export interface DeleteFileCommand {
  fileId: string;
  requesterId: string;
}

// Xóa file vật lý (main + thumbnail) + metadata. Chỉ owner được xóa.
@Injectable()
export class DeleteFileUseCase {
  constructor(
    @Inject(IFileRepository) private readonly fileRepository: IFileRepository,
    @Inject(IStorageProvider) private readonly storage: IStorageProvider,
  ) {}

  async execute(cmd: DeleteFileCommand): Promise<void> {
    const file = await this.fileRepository.findById(cmd.fileId);
    if (!file) throw new FileNotFoundException(cmd.fileId);
    if (!file.isOwnedBy(cmd.requesterId)) throw new FileAccessDeniedException();

    // Xóa file vật lý trước; storage.delete idempotent nên không lo lỗi nếu thiếu.
    await this.storage.delete(file.filename);
    if (file.thumbnailUrl) {
      await this.storage.delete(`thumb_${file.filename}`);
    }

    await this.fileRepository.delete(file.id!);
  }
}
