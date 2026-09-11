import { FileEntity } from './file.entity';

export abstract class IFileRepository {
  abstract findById(id: string): Promise<FileEntity | null>;
  // Batch lookup nhiều file — dùng cho FileUrlResolver tránh N+1 khi resolve avatarUrl/fileUrl.
  abstract findByIds(ids: string[]): Promise<FileEntity[]>;
  abstract save(file: FileEntity): Promise<FileEntity>;
  abstract delete(id: string): Promise<void>;
}

export const FILE_REPOSITORY = IFileRepository;
