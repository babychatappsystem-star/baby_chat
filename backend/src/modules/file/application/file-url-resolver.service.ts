import { Inject, Injectable } from '@nestjs/common';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';

export interface ResolvedFileUrl {
  url: string;
  thumbnailUrl?: string;
}

// Service resolve fileId → url, dùng bởi các module khác (user/conversation/message)
// khi build response. Batch lookup tránh N+1. Export từ FileModule.
@Injectable()
export class FileUrlResolver {
  constructor(
    @Inject(IFileRepository) private readonly fileRepository: IFileRepository,
  ) {}

  // Resolve 1 fileId → url, null nếu không có hoặc file không tồn tại.
  async resolve(fileId?: string | null): Promise<ResolvedFileUrl | null> {
    if (!fileId) return null;
    const file = await this.fileRepository.findById(fileId);
    return file ? { url: file.url, thumbnailUrl: file.thumbnailUrl } : null;
  }

  // Batch resolve nhiều fileId → Map<fileId, ResolvedFileUrl>. Bỏ qua id null/không tồn tại.
  async resolveMany(
    fileIds: Array<string | null | undefined>,
  ): Promise<Map<string, ResolvedFileUrl>> {
    const valid = fileIds.filter((id): id is string => !!id);
    const files = await this.fileRepository.findByIds(valid);
    const map = new Map<string, ResolvedFileUrl>();
    for (const f of files) {
      if (f.id) map.set(f.id, { url: f.url, thumbnailUrl: f.thumbnailUrl });
    }
    return map;
  }
}
